import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .models.database import init_db
from .seed_data import seed_database
from .api import guard, ledger, review, reverse_check

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="BrandLedger: Pre-Publish Claim Verification Platform for Brand Governance"
)

# Enable CORS for React frontend and Chrome extension.
# Credentials are not used (the extension authenticates with X-BrandLedger-Key),
# which also keeps a wildcard origin valid.
_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup hook to initialize SQLite/PostgreSQL tables and seed baseline facts
@app.on_event("startup")
def on_startup():
    logger.info("Initializing BrandLedger database and seeding brand facts...")
    init_db()
    seed_database()
    logger.info("BrandLedger ready to guard brand integrity.")

# Register API routes
app.include_router(guard.router, prefix=settings.API_PREFIX)
app.include_router(ledger.router, prefix=settings.API_PREFIX)
app.include_router(review.router, prefix=settings.API_PREFIX)
app.include_router(reverse_check.router, prefix=settings.API_PREFIX)

@app.get("/health")
@app.get(f"{settings.API_PREFIX}/health")
def health():
    """Liveness + DB check used by the Chrome extension's 'Test connection' button
    and by hosting platforms' health probes."""
    from sqlalchemy import text
    from .models.database import engine, SessionLocal, Fact
    db_ok, facts = True, 0
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            facts = db.query(Fact).filter(Fact.is_active == True).count()
    except Exception as exc:  # noqa: BLE001
        logger.error("Health check DB failure: %s", exc)
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": engine.dialect.name,
        "database_ok": db_ok,
        "active_facts": facts,
        "auth_required": bool(settings.GUARD_API_KEY),
        "version": settings.VERSION,
    }

@app.get("/")
def root():
    return {
        "platform": "BrandLedger",
        "description": "Pre-Publish Claim Verification Platform for Brand Governance",
        "status": "ONLINE",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "endpoints": {
            "guard_api": f"{settings.API_PREFIX}/guard",
            "source_of_truth_ledger": f"{settings.API_PREFIX}/ledger",
            "review_workflow": f"{settings.API_PREFIX}/review",
            "reverse_check_engine": f"{settings.API_PREFIX}/reverse-check"
        }
    }
