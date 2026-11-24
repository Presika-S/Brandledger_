import json
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, String, Integer, Boolean,
    DateTime, Date, Text, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from ..config import settings

Base = declarative_base()

class Fact(Base):
    __tablename__ = "facts"

    id = Column(String(64), primary_key=True)
    statement = Column(Text, nullable=False)
    category = Column(String(64), nullable=False)
    fact_owner = Column(String(128), nullable=False)
    source = Column(String(512), nullable=False)
    expiry_date = Column(Date, nullable=True)
    visibility = Column(String(32), default="PUBLIC")
    tags = Column(Text, default="[]") # JSON list of tags
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = relationship("FactVersion", back_populates="fact", cascade="all, delete-orphan", order_by="desc(FactVersion.version_number)")

class FactVersion(Base):
    __tablename__ = "fact_versions"

    id = Column(String(64), primary_key=True)
    fact_id = Column(String(64), ForeignKey("facts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    statement = Column(Text, nullable=False)
    updated_by = Column(String(128), nullable=False)
    change_reason = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    fact = relationship("Fact", back_populates="versions")

class PublishedAsset(Base):
    __tablename__ = "published_assets"

    id = Column(String(64), primary_key=True)
    draft_id = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    content = Column(Text, nullable=False)
    channel = Column(String(64), default="Web")
    published_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="PUBLISHED") # PUBLISHED, REQUIRES_UPDATE, ARCHIVED
    linked_facts_json = Column(Text, default="{}") # fact_id: version_number

    claims = relationship("PublishedClaim", back_populates="asset", cascade="all, delete-orphan")

class PublishedClaim(Base):
    __tablename__ = "published_claims"

    id = Column(String(64), primary_key=True)
    asset_id = Column(String(64), ForeignKey("published_assets.id"), nullable=False)
    claim_text = Column(Text, nullable=False)
    fact_id = Column(String(64), nullable=False)
    fact_version = Column(Integer, nullable=False)
    status = Column(String(32), default="CURRENT") # CURRENT, OUTDATED

    asset = relationship("PublishedAsset", back_populates="claims")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True)
    action_type = Column(String(64), nullable=False)
    actor = Column(String(128), nullable=False)
    role = Column(String(64), nullable=False)
    details_json = Column(Text, default="{}")
    timestamp = Column(DateTime, default=datetime.utcnow)

# Engine & Session initialization
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
# Reuse healthy connections and give SQLite a little time to release write locks.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=({**connect_args, "timeout": 30} if settings.DATABASE_URL.startswith("sqlite") else connect_args),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
