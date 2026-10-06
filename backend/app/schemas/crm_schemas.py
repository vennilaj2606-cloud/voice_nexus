from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

# Lead Schemas
class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    status: Optional[str] = "new"
    source: Optional[str] = "Voice AI Call"
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    phone: str
    email: Optional[str]
    status: str
    source: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Property Schemas
class PropertyCreate(BaseModel):
    title: str
    address: str
    price: float
    bedrooms: int = 1
    bathrooms: float = 1.0
    status: str = "available"
    description: str

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    price: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None


class PropertyResponse(BaseModel):
    id: UUID
    organization_id: UUID
    title: str
    address: str
    price: float
    bedrooms: int
    bathrooms: float
    status: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentCreate(BaseModel):
    customer_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    title: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    lead_id: Optional[UUID]
    title: str
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Call Log Schemas
class ConversationSchema(BaseModel):
    id: UUID
    role: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True

class CallResponse(BaseModel):
    id: UUID
    organization_id: UUID
    caller_number: str
    receiver_number: str
    direction: str
    status: str
    duration_seconds: int
    recording_url: Optional[str]
    transcript: Optional[str]
    sentiment: str
    created_at: datetime
    conversations: List[ConversationSchema] = []

    class Config:
        from_attributes = True

# AI Prompt Schemas
class AIPromptCreate(BaseModel):
    name: str
    industry: str = "real_estate"
    system_prompt: str
    greeting: str
    voice_settings: Optional[Dict[str, Any]] = {"speed": 1.0, "stability": 0.5}

class AIPromptUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    system_prompt: Optional[str] = None
    greeting: Optional[str] = None
    voice_settings: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class AIPromptResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    industry: str
    system_prompt: str
    greeting: str
    voice_settings: Dict[str, Any]
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True
