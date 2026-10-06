import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.models import User, Organization, UserRole
from app.schemas.auth_schemas import UserRegister, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token

class AuthService:

    @staticmethod
    async def register_user(db: AsyncSession, register_data: UserRegister):
        # Check if user already exists
        existing_user = await db.execute(select(User).filter(User.email == register_data.email))
        if existing_user.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Check organization slug uniqueness
        existing_org = await db.execute(select(Organization).filter(Organization.slug == register_data.organization_slug))
        if existing_org.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization slug already exists")

        # Create Organization (Tenant)
        api_key = f"vn_live_{secrets.token_urlsafe(24)}"
        org = Organization(
            name=register_data.organization_name,
            slug=register_data.organization_slug,
            api_key=api_key,
            settings={"default_voice": "21m00Tcm4TlvDq8ikWAM", "stt_provider": "deepgram"}
        )
        db.add(org)
        await db.flush()

        # Create Admin User
        user = User(
            organization_id=org.id,
            email=register_data.email,
            password_hash=get_password_hash(register_data.password),
            full_name=register_data.full_name,
            role=UserRole.ADMIN.value,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: UserLogin):
        result = await db.execute(select(User).filter(User.email == login_data.email))
        user = result.scalars().first()
        
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
            
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is deactivated")
            
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }

    @staticmethod
    async def refresh_access_token(refresh_token: str):
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user_id = payload.get("sub")
        new_access_token = create_access_token(subject=user_id)
        new_refresh_token = create_refresh_token(subject=user_id)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
