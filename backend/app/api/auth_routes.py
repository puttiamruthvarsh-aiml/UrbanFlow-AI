
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.security import (
    authenticate_user,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)
    role: str


@router.post("/login")
def login(request: LoginRequest):
    allowed_roles = {"USER", "EMERGENCY", "ADMIN"}

    if request.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = authenticate_user(request.username, request.password)

    if not user or user["role"] != request.role:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials or incorrect account role"
        )

    token = create_access_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return user
