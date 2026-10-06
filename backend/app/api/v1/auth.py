from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.schemas.auth_schemas import UserRegister, UserLogin, Token, RefreshTokenRequest, UserResponse
from app.services.auth_service import AuthService
from app.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(register_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new organization and admin user."""
    return await AuthService.register_user(db, register_data)

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT access/refresh tokens."""
    res = await AuthService.authenticate_user(db, login_data)
    return Token(
        access_token=res["access_token"],
        refresh_token=res["refresh_token"],
        token_type=res.get("token_type", "bearer"),
        user=res["user"]
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: RefreshTokenRequest):
    """Obtain a new access token using a valid refresh token."""
    res = await AuthService.refresh_access_token(token_data.refresh_token)
    return Token(access_token=res["access_token"], refresh_token=res["refresh_token"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get profile of current logged in user."""
    return current_user
