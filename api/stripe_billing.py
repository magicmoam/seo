"""Vercel serverless function for /api/stripe/* — Stripe billing endpoints."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from api._deps import get_current_user

app = FastAPI()


@app.post("/api/stripe/checkout")
async def create_checkout(request: Request, auth_result=Depends(get_current_user)):
    """Create a Stripe Checkout Session and return the URL."""
    import stripe

    from src.config import config
    from src.db import get_or_create_user

    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    stripe.api_key = config.stripe_secret_key
    if not stripe.api_key:
        return JSONResponse({"error": "Stripe not configured"}, status_code=500)

    try:
        body = await request.json()
    except Exception:
        body = {}

    price_id = body.get("price_id", config.stripe_pro_monthly_price_id)
    if not price_id:
        return JSONResponse({"error": "No price_id provided"}, status_code=400)

    # Ensure user exists in our DB
    db_user = await get_or_create_user(user["email"], user.get("name", ""), user.get("picture", ""))

    # Get or create Stripe customer
    customer_id = db_user.get("stripe_customer_id") if db_user else None
    if not customer_id:
        customer = stripe.Customer.create(
            email=user["email"],
            name=user.get("name", ""),
            metadata={"source": "tryseo.ai"},
        )
        customer_id = customer.id
        # Save customer ID
        from src.db import update_user_tier
        await update_user_tier(user["email"], db_user.get("tier", "free"), stripe_customer_id=customer_id)

    # Determine success/cancel URLs from Origin header
    origin = request.headers.get("origin", "https://tryseo.ai")

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{origin}/#/app?upgraded=true",
        cancel_url=f"{origin}/#/pricing",
        metadata={"user_email": user["email"]},
    )

    return JSONResponse({"url": session.url})


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    import stripe

    from src.config import config

    stripe.api_key = config.stripe_secret_key
    if not stripe.api_key:
        return JSONResponse({"error": "Stripe not configured"}, status_code=500)

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.stripe_webhook_secret
        )
    except ValueError:
        return JSONResponse({"error": "Invalid payload"}, status_code=400)
    except stripe.error.SignatureVerificationError:
        return JSONResponse({"error": "Invalid signature"}, status_code=400)

    from src.db import get_user_by_stripe_customer, reset_credits, update_user_tier

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        email = session.get("metadata", {}).get("user_email") or session.get("customer_email", "")

        if not email and customer_id:
            db_user = await get_user_by_stripe_customer(customer_id)
            if db_user:
                email = db_user["email"]

        if email:
            await update_user_tier(email, "pro", customer_id, subscription_id)
            await reset_credits(email, 200)

    elif event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        if customer_id:
            db_user = await get_user_by_stripe_customer(customer_id)
            if db_user:
                await reset_credits(db_user["email"], 200)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        if customer_id:
            db_user = await get_user_by_stripe_customer(customer_id)
            if db_user:
                await update_user_tier(db_user["email"], "free")
                await reset_credits(db_user["email"], 5)

    return JSONResponse({"received": True})


@app.post("/api/stripe/portal")
async def create_portal(request: Request, auth_result=Depends(get_current_user)):
    """Create a Stripe Customer Portal session and return the URL."""
    import stripe

    from src.config import config
    from src.db import get_user

    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    stripe.api_key = config.stripe_secret_key
    if not stripe.api_key:
        return JSONResponse({"error": "Stripe not configured"}, status_code=500)

    db_user = await get_user(user["email"])
    if not db_user or not db_user.get("stripe_customer_id"):
        return JSONResponse({"error": "No active subscription found"}, status_code=404)

    origin = request.headers.get("origin", "https://tryseo.ai")

    session = stripe.billing_portal.Session.create(
        customer=db_user["stripe_customer_id"],
        return_url=f"{origin}/#/account",
    )

    return JSONResponse({"url": session.url})
