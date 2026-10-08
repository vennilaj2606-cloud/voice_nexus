from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.api.deps import get_db
from app.models import Organization, AIPrompt
from app.services.rag_service import RAGService

router = APIRouter(prefix="/widget", tags=["CDN Embeddable Widget"])

class WidgetChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "widget_session"
    customer_name: Optional[str] = "Website Visitor"
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None

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
        "Hello! Thanks for visiting Apex Realty. My name is Priya, your R4R AI Advisor. "
        "How can I help you find your ideal property, check availability, or book a viewing today?"
    )
    name = "Priya"
    title = "R4R AI Advisor"
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
    """
    Handles speech and text queries from the embeddable widget.
    Analyzes intent independently, prioritizes live dynamic business data,
    retrieves uploaded document content, and combines both sources seamlessly.
    """
    user_text = chat_in.message.strip()
    if not user_text:
        return WidgetChatResponse(reply="I am listening! How may I assist you with our active listings, company policies, or booking a private viewing?")

    # Retrieve default organization
    org_res = await db.execute(select(Organization))
    org = org_res.scalars().first()
    org_id = org.id if org else None

    rag_service = RAGService(db, org_id)
    dual_result = await rag_service.query_dual_source(
        user_question=user_text,
        customer_name=chat_in.customer_name,
        customer_phone=chat_in.customer_phone,
        session_id=chat_in.session_id,
        conversation_history=chat_in.conversation_history
    )

    return WidgetChatResponse(
        reply=dual_result["answer"],
        action=dual_result.get("action"),
        properties=dual_result.get("database_results")
    )
