import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.models import User
from pydantic_schema.request import LoginRequest
from pydantic_schema.response import AuthTokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("utf-8")


def _sign_token(payload: dict) -> str:
    secret = os.getenv("AUTH_SECRET", "dev-secret-change-me").encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(payload_bytes)
    sig = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)
    return f"{payload_b64}.{sig_b64}"


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("utf-8"))


def _verify_and_decode_token(token: str) -> dict:
    try:
        payload_b64, sig_b64 = token.split(".", 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    secret = os.getenv("AUTH_SECRET", "dev-secret-change-me").encode("utf-8")
    expected_sig = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    expected_sig_b64 = _b64url_encode(expected_sig)
    if not hmac.compare_digest(expected_sig_b64, sig_b64):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    exp = payload.get("exp")
    if isinstance(exp, int) and exp < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    return payload


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")

    token = parts[1].strip()
    payload = _verify_and_decode_token(token)

    user_id = payload.get("sub")
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return user


@router.post("/login", response_model=AuthTokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_name == payload.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not hmac.compare_digest(user.password, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    now = int(time.time())
    token = _sign_token(
        {
            "sub": user.id,
            "username": user.user_name,
            "iat": now,
            "exp": now + 60 * 60 * 24,
        }
    )

    return AuthTokenOut(token=token, token_type="bearer", user_id=user.id, user_name=user.user_name)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
