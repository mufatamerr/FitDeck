import os
from pathlib import Path

from dotenv import load_dotenv

from app import create_app

_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

app = create_app()


@app.shell_context_processor
def _shell_context():
    from app.db import db
    from app import models  # noqa: F401

    return {"db": db}

