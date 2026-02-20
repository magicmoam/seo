from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    # LLM
    llm_provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "openai"))
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o"))
    anthropic_api_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    anthropic_model: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"))

    # Jina
    jina_api_key: str = field(default_factory=lambda: os.getenv("JINA_API_KEY", ""))

    # Google Auth
    google_client_id: str = field(default_factory=lambda: os.getenv("GOOGLE_CLIENT_ID", ""))
    allowed_emails: list[str] = field(
        default_factory=lambda: [
            e.strip() for e in os.getenv("ALLOWED_EMAILS", "").split(",") if e.strip()
        ]
    )

    # Supabase
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_key: str = field(default_factory=lambda: os.getenv("SUPABASE_KEY", ""))

    # GA4
    ga4_credentials_json: str = field(default_factory=lambda: os.getenv("GA4_CREDENTIALS_JSON", ""))
    google_client_secret: str = field(default_factory=lambda: os.getenv("GOOGLE_CLIENT_SECRET", ""))
    ga4_token_encryption_key: str = field(default_factory=lambda: os.getenv("GA4_TOKEN_ENCRYPTION_KEY", ""))

    # Stripe
    stripe_secret_key: str = field(default_factory=lambda: os.getenv("STRIPE_SECRET_KEY", ""))
    stripe_webhook_secret: str = field(default_factory=lambda: os.getenv("STRIPE_WEBHOOK_SECRET", ""))
    stripe_publishable_key: str = field(default_factory=lambda: os.getenv("STRIPE_PUBLISHABLE_KEY", ""))
    stripe_pro_monthly_price_id: str = field(default_factory=lambda: os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID", ""))
    stripe_pro_annual_price_id: str = field(default_factory=lambda: os.getenv("STRIPE_PRO_ANNUAL_PRICE_ID", ""))

    # Admin
    admin_emails: list[str] = field(
        default_factory=lambda: [
            e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
        ]
    )

    # Cron secret (for Vercel cron authentication)
    cron_secret: str = field(default_factory=lambda: os.getenv("CRON_SECRET", ""))

    # Defaults
    max_search_results: int = 5
    max_competitors: int = 10
    content_max_tokens: int = field(
        default_factory=lambda: int(os.getenv("CONTENT_MAX_TOKENS", "8192"))
    )

    def validate(self) -> list[str]:
        errors = []
        if self.llm_provider == "openai" and not self.openai_api_key:
            errors.append("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        if self.llm_provider == "anthropic" and not self.anthropic_api_key:
            errors.append("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic")
        return errors


config = Config()
