
import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv(
    "URBANFLOW_SECRET_KEY",
    "development-only-change-this-secret-key"
)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

# Temporary demo accounts
DEMO_USERS = {
    "user": {
        "username": "user",
        "password": os.getenv("DEMO_USER_PASSWORD", "User@123"),
        "role": "USER",
        "name": "UrbanFlow User"
    },
    "emergency": {
        "username": "emergency",
        "password": os.getenv("DEMO_EMERGENCY_PASSWORD", "Emergency@123"),
        "role": "EMERGENCY",
        "name": "Emergency Responder"
    },
    "admin": {
        "username": "admin",
        "password": os.getenv("DEMO_ADMIN_PASSWORD", "Admin@123"),
        "role": "ADMIN",
        "name": "System Administrator"
    }
}

# Hash demo passwords
for account in DEMO_USERS.values():
    account["password_hash"] = password_hash.hash(
        account.pop("password")
    )


def authenticate_user(username: str, password: str):
    account = DEMO_USERS.get(username.lower())

    if not account:
        return None

    if not password_hash.verify(
        password,
        account["password_hash"]
    ):
        return None

    return {
        "username": account["username"],
        "name": account["name"],
        "role": account["role"]
    }


def create_access_token(user: dict):
    expires = datetime.now(timezone.utc) + timedelta(
        hours=ACCESS_TOKEN_EXPIRE_HOURS
    )

    payload = {
        "sub": user["username"],
        "role": user["role"],
        "exp": expires
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")
        role = payload.get("role")
        account = DEMO_USERS.get(username)

        if not account or account["role"] != role:
            raise unauthorized

        return {
            "username": account["username"],
            "name": account["name"],
            "role": account["role"]
        }

    except jwt.InvalidTokenError:
        raise unauthorized


def require_role(*allowed_roles):
    def role_checker(
        user: dict = Depends(get_current_user)
    ):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this resource"
            )

        return user

    return role_checker
