import aiosqlite
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import get_settings
from models import UserCreate, UserOut, UserRole

DB_PATH = Path(__file__).parent.parent / "data" / "aria.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


# ── DB setup ───────────────────────────────────────────────────────────────────

async def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'analyst',
                created_at TEXT NOT NULL
            )
        """)
        await db.commit()
    await seed_demo_users()


async def seed_demo_users():
    demo_users = [
        UserCreate(email="commander@aria.gov", password="aria2026",
                   role=UserRole.commander, full_name="Commander Singh"),
        UserCreate(email="analyst@aria.gov", password="aria2026",
                   role=UserRole.analyst, full_name="Analyst Sharma"),
        UserCreate(email="field@aria.gov", password="aria2026",
                   role=UserRole.field, full_name="Field Officer Rao"),
    ]
    for user in demo_users:
        try:
            await create_user(user)
        except Exception:
            pass  # Already exists


# ── User operations ────────────────────────────────────────────────────────────

async def create_user(user: UserCreate) -> UserOut:
    async with aiosqlite.connect(DB_PATH) as db:
        existing = await db.execute("SELECT id FROM users WHERE email = ?", (user.email,))
        if await existing.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = str(uuid.uuid4())
        hashed = pwd_context.hash(user.password)
        await db.execute(
            "INSERT INTO users (id, email, full_name, hashed_password, role, created_at) VALUES (?,?,?,?,?,?)",
            (user_id, user.email, user.full_name, hashed, user.role.value, datetime.utcnow().isoformat())
        )
        await db.commit()
        return UserOut(id=user_id, email=user.email, full_name=user.full_name, role=user.role)


async def get_user_by_email(email: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None


# ── JWT ────────────────────────────────────────────────────────────────────────

def create_access_token(user: UserOut) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role.value,
        "exp": expire
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> UserOut:
    settings = get_settings()
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return UserOut(id=user_id, email=email, full_name="", role=UserRole(role))
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


def require_role(*roles: UserRole):
    async def checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker
