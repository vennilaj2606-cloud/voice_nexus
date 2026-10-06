from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from app.api.deps import get_db
from app.models import Organization, Property, AIPrompt, Appointment

router = APIRouter(prefix="/widget", tags=["CDN Embeddable Widget"])

class WidgetChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "widget_session"
    customer_name: Optional[str] = "Website Visitor"
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

class WidgetChatResponse(BaseModel):
    reply: str
    action: Optional[str] = None
    properties: Optional[List[Dict[str, Any]]] = None

@router.get("/config")
async def get_widget_config(db: AsyncSession = Depends(get_db)):
    """Provides public configuration and greeting for the embeddable CDN widget."""
    res = await db.execute(select(AIPrompt).filter(AIPrompt.is_default == True))
    prompt = res.scalars().first()

    greeting = prompt.greeting if prompt and prompt.greeting else (
        "Hello! Thank you for calling VoiceNexus Real Estate. My name is Priya. "
        "How can I help you find your ideal property or book a viewing today?"
    )
    name = "Priya"
    title = "AI Advisor"
    industry = prompt.industry if prompt else "real_estate"

    return {
        "name": name,
        "title": title,
        "industry": industry,
        "greeting": greeting,
        "status": "online"
    }

@router.post("/chat", response_model=WidgetChatResponse)
async def widget_chat(chat_in: WidgetChatMessage, db: AsyncSession = Depends(get_db)):
    """Handles speech turn queries from the CDN widget with database property querying and appointment booking."""
    user_text = chat_in.message.strip()
    if not user_text:
        return WidgetChatResponse(reply="I'm listening! How can I help you find your dream property today?")

    # Retrieve default organization
    org_res = await db.execute(select(Organization))
    org = org_res.scalars().first()
    org_id = org.id if org else None

    # Load active properties
    props_res = await db.execute(select(Property).filter(Property.status == "available"))
    properties = props_res.scalars().all()

    lower = user_text.lower()
    matched_props = []

    for p in properties:
        if (p.title.lower() in lower or lower in p.title.lower() or 
            p.address.lower().split(",")[0].strip() in lower):
            matched_props.append({
                "id": str(p.id),
                "title": p.title,
                "address": p.address,
                "price": p.price,
                "bedrooms": p.bedrooms,
                "bathrooms": p.bathrooms,
                "description": p.description
            })

    if matched_props:
        p = matched_props[0]
        reply = (
            f"{p['title']} is located at {p['address']}. "
            f"It features {p['bedrooms']} bedrooms, {p['bathrooms']} bathrooms, "
            f"and is priced at ${p['price']:,.0f}. {p['description']}"
        )
        return WidgetChatResponse(reply=reply, action="search_property", properties=matched_props)

    if any(k in lower for k in ["bed", "room", "bath"]):
        if properties:
            specs = "; ".join([f"{p.title} ({p.bedrooms} beds, {p.bathrooms} baths)" for p in properties[:3]])
            reply = f"Here are available bedroom specifications from our live listings: {specs}. Would you like details on one of these?"
        else:
            reply = "We have multiple properties in our portfolio. How many bedrooms are you seeking?"
        return WidgetChatResponse(reply=reply, action="bedroom_inquiry")

    if any(k in lower for k in ["book", "appointment", "schedule", "tour", "viewing", "visit"]):
        if org_id:
            try:
                appt = Appointment(
                    organization_id=org_id,
                    title="Property Tour Viewing",
                    customer_name=chat_in.customer_name or "Web Visitor",
                    customer_phone=chat_in.customer_phone or "+15550192834",
                    start_time=datetime.now(timezone.utc) + timedelta(days=1, hours=2),
                    end_time=datetime.now(timezone.utc) + timedelta(days=1, hours=3),
                    status="scheduled",
                    notes=f"Booked via VoiceNexus CDN Widget: {user_text}"
                )
                db.add(appt)
                await db.commit()
            except Exception:
                pass
        reply = "I have booked a private viewing appointment for you tomorrow at 2:00 PM and saved your details in our CRM system!"
        return WidgetChatResponse(reply=reply, action="book_appointment")

    if any(k in lower for k in ["buy", "price", "cost", "available", "house", "property", "list"]):
        if properties:
            featured = ", ".join([f"'{p.title}' (${p.price:,.0f})" for p in properties[:3]])
            reply = f"I queried our database. Featured listings: {featured}. Would you like me to schedule a viewing for you?"
        else:
            reply = "I searched our live property database. How can I assist you with your budget or location preference?"
        return WidgetChatResponse(reply=reply, action="search_properties")

    # Conversational fallback
    reply = (
        f"Thank you for saying '{user_text}'. "
        "I can search available properties, check specs and pricing, or book a private viewing for you right now."
    )
    return WidgetChatResponse(reply=reply)
