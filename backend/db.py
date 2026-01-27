import os

from sqlalchemy import inspect, text
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models.models import Base
from models.models import User

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/maintainx"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)

    def _table_exists(conn, table_name: str) -> bool:
        return (
            conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = :table
                    LIMIT 1
                    """
                ),
                {"table": table_name},
            ).scalar()
            is not None
        )

    def _column_exists(conn, table_name: str, column_name: str) -> bool:
        return (
            conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = :table
                      AND column_name = :column
                    LIMIT 1
                    """
                ),
                {"table": table_name, "column": column_name},
            ).scalar()
            is not None
        )

    with engine.begin() as conn:
        if _table_exists(conn, "assets"):
            if not _column_exists(conn, "assets", "status"):
                conn.execute(text("ALTER TABLE assets ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'running'"))

        if _table_exists(conn, "work_orders"):
            if not _column_exists(conn, "work_orders", "vendor_id"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN vendor_id INTEGER"))
            if not _column_exists(conn, "work_orders", "procedure_id"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN procedure_id INTEGER"))
            if not _column_exists(conn, "work_orders", "assigned_user_id"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN assigned_user_id INTEGER"))
            if not _column_exists(conn, "work_orders", "status"):
                conn.execute(text("ALTER TABLE work_orders ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open'"))

        if not _table_exists(conn, "team_users"):
            conn.execute(
                text(
                    """
                    CREATE TABLE team_users (
                        id SERIAL PRIMARY KEY,
                        team_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        CONSTRAINT uq_team_users UNIQUE (team_id, user_id),
                        FOREIGN KEY(team_id) REFERENCES teams (id) ON DELETE CASCADE,
                        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                    """
                )
            )

        if not _table_exists(conn, "work_order_parts"):
            conn.execute(
                text(
                    """
                    CREATE TABLE work_order_parts (
                        work_order_id INTEGER NOT NULL,
                        part_id INTEGER NOT NULL,
                        quantity INTEGER NOT NULL DEFAULT 1,
                        PRIMARY KEY (work_order_id, part_id),
                        FOREIGN KEY(work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE,
                        FOREIGN KEY(part_id) REFERENCES parts (id) ON DELETE CASCADE
                    )
                    """
                )
            )
        else:
            if not _column_exists(conn, "work_order_parts", "quantity"):
                conn.execute(text("ALTER TABLE work_order_parts ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1"))

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.user_name == "admin").first()
        if not existing:
            db.add(User(user_name="admin", password="12345", role="admin"))
            db.commit()
    finally:
        db.close()
