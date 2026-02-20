"""Local dev server for trySEO.ai — combines all API endpoints + static files."""

from __future__ import annotations

import os
import sys

# Ensure project root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="trySEO.ai Dev Server")

# Import all API sub-apps and mount their routes
from api.query import app as query_app
from api.config import app as config_app
from api.usage import app as usage_app
from api.evidence import app as evidence_app
from api.analytics import app as analytics_app
from api.tracking import app as tracking_app
from api.history import app as history_app
from api.free_audit import app as free_audit_app
from api.stripe_billing import app as stripe_app
from api.admin import app as admin_app

# Mount all API routes from sub-apps
for sub_app in [query_app, config_app, usage_app, evidence_app, analytics_app,
                tracking_app, history_app, free_audit_app, stripe_app, admin_app]:
    for route in sub_app.routes:
        app.routes.append(route)

# Try to import optional API apps
try:
    from api.ga4_connect import app as ga4_app
    for route in ga4_app.routes:
        app.routes.append(route)
except ImportError:
    pass

try:
    from api.report import app as report_app
    for route in report_app.routes:
        app.routes.append(route)
except ImportError:
    pass

# Serve static files from public/
STATIC_DIR = Path(__file__).parent.parent / "public"
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.server:app", host="0.0.0.0", port=3002, reload=True)
