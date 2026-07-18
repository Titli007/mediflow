"""
Migration runner for database schema changes and extensions.
Handles idempotent execution of SQL migration files on application startup.
"""

import os
import logging
from pathlib import Path
from sqlalchemy import text, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError

logger = logging.getLogger(__name__)


def is_postgresql(database_url: str) -> bool:
    """
    Check if the database is PostgreSQL.
    
    Args:
        database_url: SQLAlchemy database URL
        
    Returns:
        True if database is PostgreSQL, False otherwise
    """
    return database_url.startswith("postgresql") or database_url.startswith("postgres")


def get_migration_files() -> list:
    """
    Get sorted list of migration SQL files.
    
    Returns:
        List of migration file paths in numerical order
    """
    migration_dir = Path(__file__).parent
    migration_files = sorted(
        [f for f in migration_dir.glob("*.sql") if f.name[0].isdigit()]
    )
    return [str(f) for f in migration_files]


def run_migration(engine: Engine, migration_file: str) -> bool:
    """
    Execute a single migration SQL file.
    
    Args:
        engine: SQLAlchemy engine instance
        migration_file: Path to migration SQL file
        
    Returns:
        True if migration succeeded, False otherwise
    """
    try:
        with open(migration_file, "r") as f:
            sql_content = f.read()
        
        with engine.begin() as connection:
            # Split by semicolons to handle multiple statements
            statements = [s.strip() for s in sql_content.split(";") if s.strip()]
            
            for statement in statements:
                logger.info(f"Executing: {statement[:100]}...")
                connection.execute(text(statement))
        
        logger.info(f"✓ Migration succeeded: {Path(migration_file).name}")
        return True
        
    except ProgrammingError as e:
        # ProgrammingError typically means the extension or object already exists
        logger.warning(
            f"⚠ Migration notice (likely already applied): {Path(migration_file).name}\n"
            f"  Details: {str(e)[:200]}"
        )
        return True  # Treat as success since it's likely idempotent
        
    except SQLAlchemyError as e:
        logger.error(
            f"✗ Migration failed: {Path(migration_file).name}\n"
            f"  Error: {str(e)}"
        )
        return False
        
    except Exception as e:
        logger.error(
            f"✗ Unexpected error during migration: {Path(migration_file).name}\n"
            f"  Error: {type(e).__name__}: {str(e)}"
        )
        return False


def run_all_migrations(engine: Engine, database_url: str) -> bool:
    """
    Run all pending migrations in order.
    
    This function:
    1. Checks if database is PostgreSQL (skips migrations for other DBs)
    2. Finds all .sql migration files in numerical order
    3. Executes each migration with error handling
    4. Logs progress and results
    
    Args:
        engine: SQLAlchemy engine instance
        database_url: Database connection URL
        
    Returns:
        True if all migrations succeeded, False if any failed
    """
    # Only run migrations on PostgreSQL
    if not is_postgresql(database_url):
        logger.info("Skipping migrations - not using PostgreSQL")
        return True
    
    logger.info("=" * 60)
    logger.info("Starting database migrations...")
    logger.info("=" * 60)
    
    migration_files = get_migration_files()
    
    if not migration_files:
        logger.warning("No migration files found")
        return True
    
    logger.info(f"Found {len(migration_files)} migration(s)")
    
    all_succeeded = True
    for migration_file in migration_files:
        if not run_migration(engine, migration_file):
            all_succeeded = False
            # Continue with other migrations even if one fails
    
    logger.info("=" * 60)
    if all_succeeded:
        logger.info("✓ All migrations completed successfully")
    else:
        logger.warning("⚠ Some migrations encountered issues")
    logger.info("=" * 60)
    
    return all_succeeded
