import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum, Index
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from sqlalchemy.orm import relationship
try:
    from pgvector.sqlalchemy import Vector as PG_Vector
    VECTOR_TYPE = PG_Vector(1536).with_variant(Text, "sqlite")
except ImportError:
    VECTOR_TYPE = Text
import enum

from app.database.session import Base

from sqlalchemy.types import TypeDecorator, CHAR

class GUID(TypeDecorator):
    """Platform-independent GUID type that uses PostgreSQL UUID or CHAR(36) on SQLite."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(str(value)))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        return value

UUID_TYPE = GUID
JSONB_TYPE = PG_JSONB().with_variant(JSON, "sqlite")


class UserRole(str, enum.Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    AGENT = "agent"
    VIEWER = "viewer"

class CallDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"

class CallStatus(str, enum.Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BUSY = "busy"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    CANCELED = "canceled"

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    APPOINTMENT_SCHEDULED = "appointment_scheduled"
    CONVERTED = "converted"
    LOST = "lost"

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

# 1. Organization (Tenant)
class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    api_key = Column(String(255), unique=True, nullable=False)
    settings = Column(JSONB_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    phone_numbers = relationship("PhoneNumber", back_populates="organization", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="organization", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="organization", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="organization", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="organization", cascade="all, delete-orphan")
    calls = relationship("Call", back_populates="organization", cascade="all, delete-orphan")
    prompts = relationship("AIPrompt", back_populates="organization", cascade="all, delete-orphan")

# 2. User
class User(Base):
    __tablename__ = "users"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.ADMIN.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="users")

# 3. Phone Number
class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    number = Column(String(50), unique=True, nullable=False, index=True)
    provider = Column(String(50), default="telnyx", nullable=False) # telnyx or twilio
    voice_id = Column(String(100), default="21m00Tcm4TlvDq8ikWAM")
    prompt_id = Column(UUID_TYPE, ForeignKey("ai_prompts.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="phone_numbers")
    prompt = relationship("AIPrompt")
    calls = relationship("Call", back_populates="phone_number_rel")

# 4. Lead
class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    status = Column(String(50), default=LeadStatus.NEW.value, nullable=False)
    source = Column(String(100), default="Voice AI Call")
    notes = Column(Text, nullable=True)
    custom_data = Column(JSONB_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="leads")
    appointments = relationship("Appointment", back_populates="lead")

# 5. Customer
class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    metadata_info = Column(JSONB_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="customers")
    appointments = relationship("Appointment", back_populates="customer")

# 6. Property (Real Estate RAG Example)
class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    bedrooms = Column(Integer, default=1)
    bathrooms = Column(Float, default=1.0)
    status = Column(String(50), default="available") # available, sold, pending
    description = Column(Text, nullable=False)
    embedding = Column(VECTOR_TYPE, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="properties")

# 7. Appointment
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(UUID_TYPE, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    lead_id = Column(UUID_TYPE, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(50), default=AppointmentStatus.SCHEDULED.value, nullable=False)
    notes = Column(Text, nullable=True)
    calendar_event_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="appointments")
    customer = relationship("Customer", back_populates="appointments")
    lead = relationship("Lead", back_populates="appointments")

# 8. Call
class Call(Base):
    __tablename__ = "calls"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    phone_number_id = Column(UUID_TYPE, ForeignKey("phone_numbers.id", ondelete="SET NULL"), nullable=True)
    caller_number = Column(String(50), nullable=False)
    receiver_number = Column(String(50), nullable=False)
    direction = Column(String(20), default=CallDirection.INBOUND.value, nullable=False)
    status = Column(String(50), default=CallStatus.INITIATED.value, nullable=False)
    duration_seconds = Column(Integer, default=0)
    recording_url = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    sentiment = Column(String(50), default="neutral")
    telephony_session_id = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="calls")
    phone_number_rel = relationship("PhoneNumber", back_populates="calls")
    conversations = relationship("Conversation", back_populates="call", cascade="all, delete-orphan")
    events = relationship("CallEvent", back_populates="call", cascade="all, delete-orphan")

# 9. Conversation
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID_TYPE, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # system, user, assistant, tool
    content = Column(Text, nullable=False)
    metadata_info = Column(JSONB_TYPE, default={})
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    call = relationship("Call", back_populates="conversations")

# 10. AI Prompt
class AIPrompt(Base):
    __tablename__ = "ai_prompts"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID_TYPE, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), default="real_estate", nullable=False) # real_estate, restaurant, car_sales, healthcare, support
    system_prompt = Column(Text, nullable=False)
    greeting = Column(Text, nullable=False)
    voice_settings = Column(JSONB_TYPE, default={"speed": 1.0, "stability": 0.5})
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization", back_populates="prompts")

# 11. Call Event
class CallEvent(Base):
    __tablename__ = "call_events"

    id = Column(UUID_TYPE, primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID_TYPE, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False) # stt_received, gpt_generated, tts_streamed, transfer_initiated, call_ended
    payload = Column(JSONB_TYPE, default={})
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    call = relationship("Call", back_populates="events")
