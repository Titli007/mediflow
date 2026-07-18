from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config.settings import DATABASE_URL
from config.logging_config import get_logger

logger = get_logger(__name__)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def run_migrations():
    """
    Run database migrations on startup.
    Only runs on PostgreSQL; skipped for SQLite.
    """
    try:
        from migrations.runner import run_all_migrations
        logger.info("Running database migrations...")
        run_all_migrations(engine, DATABASE_URL)
    except Exception as e:
        logger.error(f"Error running migrations: {str(e)}")
        logger.warning("Continuing without migrations - database may be incomplete")


def init_db():
    """
    Initialize database: run migrations, then create tables.
    Called on application startup.
    """
    logger.info("Initializing database...")
    
    # Run migrations first (creates extensions, adds columns)
    run_migrations()
    
    # Create all tables (SQLAlchemy models)
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialization complete")


def get_db():
    """
    Dependency injection for database sessions.
    Yields a session that is automatically closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
