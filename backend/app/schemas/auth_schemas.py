from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None

# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    organization_name: str
    organization_slug: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    id: UUID
    organization_id: UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    api_key: str
    created_at: datetime

    class Config:
        from_attributes = True
