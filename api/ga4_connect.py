"""Vercel serverless function for /api/ga4/* — GA4 OAuth2 connection management."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tryseo.ai", "https://www.tryseo.ai", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _authenticate(request: Request) -> dict | JSONResponse:
    from src.middleware import authenticate
    return await authenticate(request)


@app.post("/api/ga4/connect")
async def ga4_connect(request: Request):
    """Exchange authorization code for tokens and store encrypted in Supabase."""
    from src.config import config
    from src.db import save_ga4_connection

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    body = await request.json()
    code = body.get("code", "")
    if not code:
        return JSONResponse({"error": "Authorization code is required"}, status_code=400)

    if not config.google_client_secret:
        return JSONResponse({"error": "OAuth2 not configured on server"}, status_code=500)

    # Exchange auth code for tokens (redirect_uri=postmessage for GIS code client)
    async with httpx.AsyncClient() as http:
        resp = await http.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": config.google_client_id,
            "client_secret": config.google_client_secret,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code",
        })

    if resp.status_code != 200:
        return JSONResponse({"error": "Failed to exchange authorization code"}, status_code=400)

    data = resp.json()
    refresh_token = data.get("refresh_token")
    access_token = data.get("access_token", "")
    expires_in = data.get("expires_in", 3600)

    if not refresh_token:
        return JSONResponse(
            {"error": "No refresh token received. Please revoke access at myaccount.google.com/permissions and try again."},
            status_code=400,
        )

    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    await save_ga4_connection(
        user_email=user["email"],
        refresh_token=refresh_token,
        access_token=access_token,
        access_token_expires_at=expires_at,
    )

    return JSONResponse({"status": "connected"})


@app.get("/api/ga4/properties")
async def ga4_properties(request: Request):
    """List GA4 properties the user has access to via Admin API."""
    from src.db import get_ga4_connection, refresh_ga4_access_token

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    connection = await get_ga4_connection(user["email"])
    if not connection:
        return JSONResponse({"error": "No GA4 connection found. Please connect first."}, status_code=404)

    access_token = await refresh_ga4_access_token(user["email"], connection)

    # Use Analytics Admin API to list account summaries
    properties = []
    next_page_token = None

    async with httpx.AsyncClient() as http:
        while True:
            params = {"pageSize": "200"}
            if next_page_token:
                params["pageToken"] = next_page_token

            resp = await http.get(
                "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )

            if resp.status_code != 200:
                return JSONResponse({"error": "Failed to list GA4 properties", "details": resp.text}, status_code=500)

            data = resp.json()

            for account in data.get("accountSummaries", []):
                account_name = account.get("displayName", "")
                for prop in account.get("propertySummaries", []):
                    properties.append({
                        "property_id": prop.get("property", ""),
                        "display_name": prop.get("displayName", ""),
                        "account_name": account_name,
                    })

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

    return JSONResponse({"properties": properties})


@app.post("/api/ga4/select-property")
async def ga4_select_property(request: Request):
    """Store the user's chosen GA4 property."""
    from src.db import get_ga4_connection, update_ga4_property

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    body = await request.json()
    property_id = body.get("property_id", "")
    property_name = body.get("property_name", "")

    if not property_id:
        return JSONResponse({"error": "property_id is required"}, status_code=400)

    connection = await get_ga4_connection(user["email"])
    if not connection:
        return JSONResponse({"error": "No GA4 connection found"}, status_code=404)

    await update_ga4_property(user["email"], property_id, property_name)
    return JSONResponse({"status": "property_selected", "property_id": property_id, "property_name": property_name})


@app.delete("/api/ga4/disconnect")
async def ga4_disconnect(request: Request):
    """Remove stored OAuth tokens."""
    from src.db import delete_ga4_connection

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    await delete_ga4_connection(user["email"])
    return JSONResponse({"status": "disconnected"})


@app.get("/api/ga4/status")
async def ga4_status(request: Request):
    """Check GA4 connection status and selected property."""
    from src.db import get_ga4_connection

    auth_result = await _authenticate(request)
    if isinstance(auth_result, JSONResponse):
        return auth_result
    user = auth_result

    connection = await get_ga4_connection(user["email"])
    if not connection:
        return JSONResponse({"connected": False})

    return JSONResponse({
        "connected": True,
        "selected_property_id": connection.get("selected_property_id", ""),
        "selected_property_name": connection.get("selected_property_name", ""),
    })
