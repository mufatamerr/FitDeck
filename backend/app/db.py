import os
from pathlib import Path

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    database_url = os.environ.get("DATABASE_URL", "sqlite:///fitdeck.db")
    # Make sqlite path stable regardless of CWD (root/fitdeck.db).
    if database_url.startswith("sqlite:///") and "://" in database_url:
        rel = database_url[len("sqlite:///") :]
        if rel and not rel.startswith("/"):
            root = Path(__file__).resolve().parents[2]
            database_url = f"sqlite:///{(root / rel).as_posix()}"
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    migrate.init_app(app, db)

