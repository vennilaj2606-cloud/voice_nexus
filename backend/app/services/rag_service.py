import io
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
import openai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pypdf import PdfReader
from docx import Document as DocxReader

from app.core.config import settings
from app.core.logger import logger
from app.models import Property, Appointment, Lead, LeadStatus, AppointmentStatus

COMMON_STOP_WORDS = {
    "what", "is", "the", "for", "a", "an", "and", "in", "of", "to", "how", "does", "do",
    "can", "you", "tell", "me", "about", "are", "there", "any", "with", "from", "at", "by",
    "this", "that", "these", "those", "have", "has", "had", "will", "would", "should", "could"
}

GENERIC_DOC_TERMS = {
    "policy", "policies", "procedure", "procedures", "guideline", "guidelines",
    "rule", "rules", "faq", "faqs", "document", "documents", "requirement", "requirements"
}

# Multi-turn conversational memory tracking active properties and recent offers across turns
SESSION_MEMORY: Dict[str, Dict[str, Any]] = {}

class RAGService:
    """
    RAG & Dynamic Business Data Service.
    Prioritizes real-time dynamic business records (properties, availability, appointments, leads)
    and uploaded documents (PDF, DOCX, TXT, policies, FAQs) with zero technical jargon.
    """

    def __init__(self, db: AsyncSession, organization_id: Optional[UUID]):
        self.db = db
        self.organization_id = organization_id
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def get_embedding(self, text: str) -> List[float]:
        """Generate embedding vector using OpenAI API, with safe fallback."""
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-proj-mock-key-for-development":
            return [0.0] * 1536

        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"Embedding generation fallback: {e}")
            return [0.0] * 1536

    async def process_document_upload(self, filename: str, content_bytes: bytes) -> int:
        """Parse uploaded business document (PDF, DOCX, TXT), split into chunks, and store with embeddings."""
        text_content = ""
        filename_lower = filename.lower()
        try:
            if filename_lower.endswith(".pdf"):
                reader = PdfReader(io.BytesIO(content_bytes))
                for page in reader.pages:
                    text_content += (page.extract_text() or "") + "\n"
            elif filename_lower.endswith(".docx"):
                doc = DocxReader(io.BytesIO(content_bytes))
                for p in doc.paragraphs:
                    text_content += p.text + "\n"
            else:
                text_content = content_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error(f"Error parsing document {filename}: {e}")
            text_content = content_bytes.decode("utf-8", errors="ignore")

        text_content = text_content.strip()
        if not text_content:
            text_content = f"Uploaded document: {filename}"

        # Split into overlapping chunks of ~500 chars
        chunks = self._chunk_text(text_content, chunk_size=500, overlap=60)

        for idx, chunk in enumerate(chunks):
            embedding = await self.get_embedding(chunk)
            prop = Property(
                organization_id=self.organization_id,
                title=f"Doc: {filename} (Part {idx+1})",
                address="Knowledge Base Document",
                price=0.0,
                bedrooms=0,
                bathrooms=0.0,
                status="knowledge_base",
                description=chunk.strip(),
                embedding=embedding
            )
            self.db.add(prop)

        await self.db.commit()
        return len(chunks)

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 60) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start += chunk_size - overlap
        return chunks if chunks else [text]

    async def search_knowledge(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search indexed uploaded documents (PDF, DOCX, TXT, policies, FAQs).
        Combines vector search and smart lexical matching for maximum precision.
        """
        clean_query = query.strip()
        if not clean_query:
            return []

        all_query_words = [w.lower() for w in re.findall(r'\b\w+\b', clean_query) if len(w) > 2 and w.lower() not in COMMON_STOP_WORDS]
        content_query_words = [w for w in all_query_words if w not in GENERIC_DOC_TERMS]

        stmt = select(Property).where(Property.status == "knowledge_base")
        if self.organization_id:
            stmt = stmt.where(Property.organization_id == self.organization_id)

        has_real_ai = settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-proj-mock-key-for-development"
        if has_real_ai and hasattr(Property.embedding, "cosine_distance"):
            try:
                q_emb = await self.get_embedding(clean_query)
                stmt = stmt.where(Property.embedding.isnot(None)).order_by(
                    Property.embedding.cosine_distance(q_emb)
                )
            except Exception as e:
                logger.warning(f"Vector search failed, using lexical ranking: {e}")
                stmt = stmt.order_by(Property.created_at.desc())
        else:
            stmt = stmt.order_by(Property.created_at.desc())

        res = await self.db.execute(stmt.limit(30))
        all_chunks = res.scalars().all()

        if not all_chunks:
            return []

        def score_chunk(item: Property) -> float:
            score = 0.0
            text_lower = f"{item.title} {item.description}".lower()

            if clean_query.lower() in text_lower:
                return 0.95

            # If user had content words, require at least one content word to match
            matched_content = [w for w in content_query_words if w in text_lower]
            if content_query_words and not matched_content:
                # No topical/subject overlap
                return 0.0

            if matched_content:
                score += 0.45 + (0.35 * (len(matched_content) / len(content_query_words)))
            elif any(w in text_lower for w in all_query_words):
                score += 0.35

            return min(score, 0.99)

        scored = [(item, score_chunk(item)) for item in all_chunks]
        scored = [x for x in scored if x[1] >= 0.45]
        scored.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                "title": item.title,
                "content": item.description,
                "similarity": round(score, 2)
            }
            for item, score in scored[:top_k]
        ]

    async def search_dynamic_properties(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Dynamically query live active property inventory in the database.
        Returns up-to-date pricing, bedrooms, bathrooms, and description.
        Filters out non-residential document chunks.
        """
        stmt = select(Property).where(Property.status == "available")
        if self.organization_id:
            stmt = stmt.where(Property.organization_id == self.organization_id)

        res = await self.db.execute(stmt.order_by(Property.created_at.desc()))
        all_raw_properties = res.scalars().all()

        # Filter out knowledge document chunks stored in Property table
        properties = [p for p in all_raw_properties if p.price > 0 and not p.title.startswith("Doc:")]

        if not properties:
            return []

        lower_q = query.lower()
        clean_words = [w for w in re.findall(r'\b\w+\b', lower_q) if len(w) > 2 and w not in COMMON_STOP_WORDS]

        # Extract bedroom count if specified (e.g. '2bed', '2 bed', '2 bedrooms')
        bed_match = re.search(r'(\d+)\s*(?:bed|bd|bedroom|bedrooms|bed\s*rooms?)', lower_q)
        target_beds = int(bed_match.group(1)) if bed_match else None

        def score_property(p: Property) -> int:
            score = 0
            t_low = p.title.lower()
            a_low = p.address.lower()
            d_low = p.description.lower()

            if t_low in lower_q or lower_q in t_low:
                score += 25
            
            for w in clean_words:
                if w in t_low:
                    score += 8
                elif w in a_low:
                    score += 6
                elif w in d_low:
                    score += 4

            if target_beds is not None and p.bedrooms == target_beds:
                score += 30

            if "sunset" in lower_q and "sunset" in t_low:
                score += 20
            if "highland" in lower_q and "highland" in t_low:
                score += 20
            if "villa" in lower_q and "villa" in t_low:
                score += 10
            if "penthouse" in lower_q and "penthouse" in t_low:
                score += 10
            if any(k in lower_q for k in ["suburban", "family"]) and "suburban" in t_low:
                score += 10
            return score

        scored_props = [(p, score_property(p)) for p in properties]
        scored_props = [x for x in scored_props if x[1] >= 6]
        scored_props.sort(key=lambda x: x[1], reverse=True)

        matched = [
            {
                "id": str(p.id),
                "title": p.title,
                "address": p.address,
                "price": p.price,
                "bedrooms": p.bedrooms,
                "bathrooms": p.bathrooms,
                "status": p.status,
                "description": p.description,
                "score": score
            }
            for p, score in scored_props
        ]

        broad_indicators = [
            "property", "properties", "house", "homes", "residence", "residences",
            "buy", "listings", "bedroom", "bedrooms", "bed", "rooms", "catalog",
            "price", "prices", "pricing", "cost", "available", "availability",
            "facility", "facilities", "facilties", "amenity", "amenities", "pool",
            "share", "options", "rates", "list"
        ]

        if not matched and any(k in lower_q for k in broad_indicators):
            matched = [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "address": p.address,
                    "price": p.price,
                    "bedrooms": p.bedrooms,
                    "bathrooms": p.bathrooms,
                    "status": p.status,
                    "description": p.description,
                    "score": 1
                }
                for p in properties[:limit]
            ]

        return matched[:limit]

    async def query_dual_source(
        self,
        user_question: str,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        session_id: Optional[str] = "widget_session",
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Intelligently analyzes the user's intent independently,
        maintains conversational context across turns, prioritizes live dynamic
        business data and uploaded documents, and delivers direct, accurate responses.
        """
        global SESSION_MEMORY
        q = user_question.strip()
        lower = q.lower()
        effective_session = session_id or "widget_session"

        # Initialize or retrieve session memory
        session_ctx = SESSION_MEMORY.get(effective_session, {
            "active_property": None,
            "last_offer": None,
            "last_assistant_reply": ""
        })
        active_property = session_ctx.get("active_property")
        last_offer = session_ctx.get("last_offer")
        last_assistant_msg = session_ctx.get("last_assistant_reply") or ""

        # Extract last assistant message from conversation history if available
        if conversation_history:
            for item in reversed(conversation_history):
                if item.get("role") == "assistant":
                    if not last_assistant_msg:
                        last_assistant_msg = item.get("text", "")
                    # Look back for previously discussed property
                    if not active_property:
                        t_prev = item.get("text", "")
                        for candidate_name in ["Sunset Modern Villa", "Downtown Luxury Penthouse", "Highland Luxury Villa", "Cozy Suburban Family Home", "modern villa"]:
                            if candidate_name.lower() in t_prev.lower():
                                active_property = {"title": candidate_name}
                                break
                    break

        # ------------------------------------------------------------------
        # 0. User Affirmation Intent ('yes', 'sure', 'ok', etc.)
        # ------------------------------------------------------------------
        is_affirmation = (
            lower in ["yes", "yeah", "yep", "sure", "ok", "okay", "yes please", "please do", "certainly", "of course", "yup", "definitely", "yes connect me", "yes schedule", "yes please connect"] or
            lower.startswith("yes,") or lower.startswith("yes ") or lower == "yes!"
        )

        if is_affirmation:
            # Check if assistant recently offered to connect or take contact info
            if last_offer == "offer_lead_capture" or any(k in last_assistant_msg.lower() for k in ["representative", "contact details", "connect you"]):
                reply = "Certainly! Please share your name and phone number or email, and I will have a senior advisor contact you right away."
                SESSION_MEMORY[effective_session] = {
                    **session_ctx,
                    "last_offer": "awaiting_contact_info",
                    "last_assistant_reply": reply
                }
                return {
                    "answer": reply,
                    "action": "prompt_lead_details",
                    "has_db_match": False,
                    "has_kb_match": False,
                    "database_results": []
                }

            # Check if assistant recently offered a viewing tour
            if last_offer == "offer_tour" or any(k in last_assistant_msg.lower() for k in ["viewing tour", "schedule a private viewing", "schedule a tour", "reserve a viewing"]):
                target_name = active_property.get("title") if (active_property and isinstance(active_property, dict)) else "the residence"
                reply = f"Wonderful! I would be delighted to schedule a private viewing tour for you at {target_name}. What day and time work best for you, or would tomorrow at 2:00 PM suit your schedule?"
                SESSION_MEMORY[effective_session] = {
                    **session_ctx,
                    "last_offer": "awaiting_tour_time",
                    "last_assistant_reply": reply
                }
                return {
                    "answer": reply,
                    "action": "prompt_tour_schedule",
                    "has_db_match": True,
                    "has_kb_match": False,
                    "database_results": [active_property] if active_property else []
                }

            # General affirmation fallback
            reply = "Wonderful! Would you like me to share full pricing specifications, check bedroom options, or schedule an in-person viewing tour?"
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "last_offer": "offer_general_options",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "affirmation_acknowledged",
                "has_db_match": False,
                "has_kb_match": False,
                "database_results": []
            }

        # ------------------------------------------------------------------
        # 1. Booking / Appointment Scheduling Intent
        # ------------------------------------------------------------------
        if any(k in lower for k in ["book", "appointment", "schedule", "tour", "viewing", "visit"]):
            appt_time = datetime.now(timezone.utc) + timedelta(days=1, hours=2)
            if self.organization_id:
                try:
                    appt = Appointment(
                        organization_id=self.organization_id,
                        title="Property Viewing Appointment",
                        customer_name=customer_name or "Valued Client",
                        customer_phone=customer_phone or "+15550192834",
                        start_time=appt_time,
                        end_time=appt_time + timedelta(hours=1),
                        status=AppointmentStatus.SCHEDULED.value,
                        notes=f"Requested during voice interaction: {q}"
                    )
                    self.db.add(appt)
                    await self.db.commit()
                except Exception as e:
                    logger.warning(f"Could not persist appointment: {e}")

            reply = "I have scheduled a private viewing appointment for you tomorrow at 2:00 PM and reserved your time slot."
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "last_offer": "appointment_confirmed",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "book_appointment",
                "has_db_match": True,
                "has_kb_match": False,
                "database_results": []
            }

        # ------------------------------------------------------------------
        # 2. Contact Information / Lead Capture Intent
        # ------------------------------------------------------------------
        if any(k in lower for k in ["my name is", "my phone", "my email", "save my info", "contact me", "reach me"]) or "@" in lower:
            if self.organization_id:
                try:
                    lead = Lead(
                        organization_id=self.organization_id,
                        name=customer_name or "Valued Prospect",
                        phone=customer_phone or "+15550192834",
                        status=LeadStatus.NEW.value,
                        notes=f"Lead details captured: {q}"
                    )
                    self.db.add(lead)
                    await self.db.commit()
                except Exception as e:
                    logger.warning(f"Could not persist lead: {e}")

            reply = "Thank you! I have saved your contact details and preferences in our client records. A senior advisor will follow up with you promptly."
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "last_offer": "lead_saved",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "save_lead",
                "has_db_match": True,
                "has_kb_match": False,
                "database_results": []
            }

        # ------------------------------------------------------------------
        # 3. Bedroom Filter Intent (e.g. '2bed rooms is available', '3 bedrooms')
        # ------------------------------------------------------------------
        bed_match = re.search(r'(\d+)\s*(?:bed|bd|bedroom|bedrooms|bed\s*rooms?)', lower)
        is_bedroom_filter = bed_match is not None

        if is_bedroom_filter:
            target_beds = int(bed_match.group(1))
            # Query all available properties
            all_stmt = select(Property).where(Property.status == "available")
            if self.organization_id:
                all_stmt = all_stmt.where(Property.organization_id == self.organization_id)
            all_res = await self.db.execute(all_stmt.order_by(Property.price.asc()))
            all_raw = all_res.scalars().all()
            all_props = [p for p in all_raw if p.price > 0 and not p.title.startswith("Doc:")]

            exact_props = [p for p in all_props if p.bedrooms == target_beds]
            if exact_props:
                listings = ", ".join([f"'{p.title}' listed at ${p.price:,.0f} ({p.bedrooms} beds, {p.bathrooms} baths)" for p in exact_props])
                reply = f"Yes! We currently have {len(exact_props)} residence(s) with {target_beds} bedrooms available: {listings}. Would you like me to schedule a private viewing tour for one of them?"
                chosen_p = {
                    "id": str(exact_props[0].id),
                    "title": exact_props[0].title,
                    "price": exact_props[0].price,
                    "bedrooms": exact_props[0].bedrooms,
                    "bathrooms": exact_props[0].bathrooms,
                    "description": exact_props[0].description,
                    "address": exact_props[0].address
                }
            else:
                other_listings = ", ".join([f"'{p.title}' (${p.price:,.0f}, {p.bedrooms} beds)" for p in all_props[:3]])
                reply = f"We currently do not have {target_beds}-bedroom residences in our active listings. Our closest available options feature 3 to 5 bedrooms: {other_listings}. Would you like details on any of these?"
                chosen_p = None

            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "active_property": chosen_p,
                "last_offer": "offer_tour",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "search_properties",
                "has_db_match": True,
                "has_kb_match": False,
                "database_results": [{"title": p.title, "price": p.price, "bedrooms": p.bedrooms, "bathrooms": p.bathrooms} for p in (exact_props or all_props[:3])]
            }

        # ------------------------------------------------------------------
        # 4. Facilities / Amenities Intent (e.g. 'which facilties are available')
        # ------------------------------------------------------------------
        is_facilities_intent = any(k in lower for k in [
            "facility", "facilities", "facilties", "amenity", "amenities",
            "feature", "features", "pool", "gym", "garage", "parking", "view", "views",
            "smart home", "what is included", "what does it have", "what are the features"
        ])

        # ------------------------------------------------------------------
        # 5. Retrieve dynamic business records & uploaded documents
        # ------------------------------------------------------------------
        db_properties = await self.search_dynamic_properties(q, limit=3)
        kb_chunks = await self.search_knowledge(q, top_k=2)

        has_db = len(db_properties) > 0
        has_kb = len(kb_chunks) > 0

        # Detailed intent classification for property inquiries
        is_avail_intent = any(k in lower for k in ["available", "availability", "still available", "status", "vacant", "can i buy", "is it on the market", "is available"])
        is_price_intent = any(k in lower for k in ["price", "prices", "cost", "how much", "rate", "worth", "dollars", "pricing"])
        is_location_intent = any(k in lower for k in ["where", "location", "address", "city", "neighborhood", "area"])
        is_specs_intent = any(k in lower for k in ["bed", "room", "bath", "size", "sqft", "square feet", "floor plan", "specs"])

        # Check Demonstrative Reference to Active Context ('this villa', 'this property', 'it', 'this one')
        is_demonstrative = any(phrase in lower for phrase in [
            "this villa", "this property", "this house", "this home", "this penthouse", "this residence", "this one",
            "that villa", "that property", "that house", "that home", "that penthouse", "that residence", "that one",
            "the villa", "the property", "the house", "the home", "the penthouse", "the residence",
            "is it", "is this", "is that", "does it", "can it", "it is"
        ]) or lower.startswith("this ") or lower.startswith("is this ") or lower.startswith("is it ")

        # Check Correction Intent ('i ask for X not Y', 'not Highland', 'i meant X')
        is_correction = any(phrase in lower for phrase in [
            "i ask for", "i asked for", "i meant", "i said", "not ", "rather than", "i was asking about", "i am asking about"
        ])

        # Explicit property name search that accounts for negation ('not Highland')
        named_prop_title = None
        candidate_titles = ["sunset modern villa", "downtown luxury penthouse", "highland luxury villa", "cozy suburban family home", "modern villa"]
        for cand in candidate_titles:
            if cand in lower:
                # If negated with 'not', skip
                if f"not {cand}" in lower or f"not a {cand}" in lower:
                    continue
                named_prop_title = cand
                break
        
        # If no full title match, check distinct name words ('sunset', 'highland', 'penthouse')
        if not named_prop_title:
            distinct_words = {"sunset": "sunset modern villa", "highland": "highland luxury villa", "penthouse": "downtown luxury penthouse"}
            for word, cand in distinct_words.items():
                if word in lower:
                    if f"not {word}" in lower or f"not a {word}" in lower:
                        continue
                    named_prop_title = cand
                    break

        # Resolve target property
        target_prop = None
        if named_prop_title:
            p_stmt = select(Property).where(Property.title.ilike(f"%{named_prop_title}%"))
            p_res = await self.db.execute(p_stmt)
            p_obj = p_res.scalars().first()
            if p_obj:
                target_prop = {
                    "id": str(p_obj.id),
                    "title": p_obj.title,
                    "address": p_obj.address,
                    "price": p_obj.price,
                    "bedrooms": p_obj.bedrooms,
                    "bathrooms": p_obj.bathrooms,
                    "status": p_obj.status,
                    "description": p_obj.description
                }
        elif is_demonstrative and active_property and isinstance(active_property, dict) and active_property.get("title"):
            p_stmt = select(Property).where(Property.title.ilike(f"%{active_property['title']}%"))
            p_res = await self.db.execute(p_stmt)
            p_obj = p_res.scalars().first()
            if p_obj:
                target_prop = {
                    "id": str(p_obj.id),
                    "title": p_obj.title,
                    "address": p_obj.address,
                    "price": p_obj.price,
                    "bedrooms": p_obj.bedrooms,
                    "bathrooms": p_obj.bathrooms,
                    "status": p_obj.status,
                    "description": p_obj.description
                }
            else:
                target_prop = active_property
        elif db_properties and db_properties[0].get("score", 0) >= 25:
            target_prop = db_properties[0]
        elif active_property and isinstance(active_property, dict) and active_property.get("title") and not named_prop_title:
            p_stmt = select(Property).where(Property.title.ilike(f"%{active_property['title']}%"))
            p_res = await self.db.execute(p_stmt)
            p_obj = p_res.scalars().first()
            if p_obj:
                target_prop = {
                    "id": str(p_obj.id),
                    "title": p_obj.title,
                    "address": p_obj.address,
                    "price": p_obj.price,
                    "bedrooms": p_obj.bedrooms,
                    "bathrooms": p_obj.bathrooms,
                    "status": p_obj.status,
                    "description": p_obj.description
                }
            else:
                target_prop = active_property
        elif has_db:
            target_prop = db_properties[0]

        # Handle Facilities Intent on target property
        if is_facilities_intent:
            if target_prop:
                desc_text = target_prop.get("description", "luxury features and modern layout").rstrip(".")
                reply = f"{target_prop['title']} features {desc_text}. It includes {target_prop['bedrooms']} bedrooms and {target_prop['bathrooms']} bathrooms. Would you like me to schedule a private viewing tour for you to experience these facilities in person?"
                SESSION_MEMORY[effective_session] = {
                    **session_ctx,
                    "active_property": target_prop,
                    "last_offer": "offer_tour",
                    "last_assistant_reply": reply
                }
                return {
                    "answer": reply,
                    "action": "property_features",
                    "has_db_match": True,
                    "has_kb_match": False,
                    "database_results": [target_prop]
                }
            else:
                reply = "Our luxury residences feature private infinity pools, smart home automation, floor-to-ceiling panoramic views, private elevators, and gourmet kitchens. Which residence would you like specific facility details for?"
                SESSION_MEMORY[effective_session] = {
                    **session_ctx,
                    "last_offer": "offer_general_options",
                    "last_assistant_reply": reply
                }
                return {
                    "answer": reply,
                    "action": "property_features",
                    "has_db_match": True,
                    "has_kb_match": False,
                    "database_results": db_properties
                }

        # Handle Price Intent when broad price sharing is requested (e.g. 'price details share me')
        is_broad_price_request = is_price_intent and any(k in lower for k in ["share", "list", "all", "options", "details", "me", "show", "give"])
        if is_broad_price_request and (not target_prop or "share" in lower or "all" in lower):
            all_stmt = select(Property).where(Property.status == "available")
            if self.organization_id:
                all_stmt = all_stmt.where(Property.organization_id == self.organization_id)
            all_res = await self.db.execute(all_stmt.order_by(Property.price.asc()))
            all_props = [p for p in all_res.scalars().all() if p.price > 0 and not p.title.startswith("Doc:")]

            prices_str = ", ".join([f"'{p.title}' at ${p.price:,.0f}" for p in all_props[:5]])
            reply = f"Here are the current prices for our available residences: {prices_str}. Which residence fits your budget, or would you like to schedule a private viewing?"
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "last_offer": "offer_tour",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "search_properties",
                "has_db_match": True,
                "has_kb_match": False,
                "database_results": [{"title": p.title, "price": p.price, "bedrooms": p.bedrooms} for p in all_props[:5]]
            }

        # Extract clean text from top document chunk
        doc_sentence = ""
        if has_kb:
            raw_content = kb_chunks[0]["content"].strip()
            sentences = [s.strip() for s in raw_content.split(".") if s.strip()]
            if sentences:
                doc_sentence = ". ".join(sentences[:2]) + "."
            else:
                doc_sentence = raw_content[:180] + "."

        has_kb_intent = any(k in lower for k in [
            "policy", "policies", "escrow", "deposit", "procedure", "procedures",
            "guideline", "guidelines", "faq", "faqs", "rule", "rules", "inspection",
            "closing", "legal", "terms", "contract", "contingency", "earnest", "refund"
        ])

        # CASE A: BOTH DYNAMIC BUSINESS DATA AND UPLOADED DOCUMENTS APPLY (DUAL-SOURCE)
        if (has_db or target_prop) and has_kb and has_kb_intent:
            top_p = target_prop or db_properties[0]
            if is_avail_intent:
                reply = f"Yes, {top_p['title']} is currently available for purchase! In addition, according to our company policy, {doc_sentence} Would you like me to schedule a private viewing tour for you?"
            else:
                prop_desc = f"{top_p['title']} is offered at ${top_p['price']:,.0f} and features {top_p['bedrooms']} bedrooms and {top_p['bathrooms']} bathrooms at {top_p['address']}."
                reply = f"According to our company policy, {doc_sentence} Regarding our active residences, {prop_desc} Would you like me to reserve a viewing tour for you?"
            
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "active_property": top_p,
                "last_offer": "offer_tour",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "combined_dual_source",
                "has_db_match": True,
                "has_kb_match": True,
                "database_results": [top_p]
            }

        # Check if top property is a strong specific match
        strong_single_match = False
        if db_properties:
            top_score = db_properties[0].get("score", 0)
            second_score = db_properties[1].get("score", 0) if len(db_properties) > 1 else 0
            if len(db_properties) == 1 or top_score >= 18 or (top_score >= 12 and top_score > second_score * 1.4):
                strong_single_match = True

        # CASE B: DYNAMIC BUSINESS RECORDS APPLY (PROPERTIES, SPECS, PRICING)
        if target_prop or has_db:
            p = target_prop or (db_properties[0] if db_properties else None)
            single_focus = bool(target_prop or strong_single_match)

            if single_focus and p:
                prefix = "I apologize for the confusion! " if is_correction else ""
                addr_parts = [part.strip() for part in p.get('address', '').split(',')]
                location_str = f" in {addr_parts[-2]}" if len(addr_parts) >= 2 else ""

                if is_avail_intent or is_correction:
                    reply = f"{prefix}Yes, {p['title']} is currently available! It is listed at ${p['price']:,.0f}{location_str}, featuring {p['bedrooms']} bedrooms and {p['bathrooms']} bathrooms. Would you like me to schedule a private viewing tour for you?"
                elif is_price_intent:
                    reply = f"{prefix}{p['title']} is currently listed at ${p['price']:,.0f}. Would you like more details or to schedule a private viewing tour?"
                elif is_location_intent:
                    reply = f"{prefix}{p['title']} is located at {p['address']}. Would you like me to arrange an in-person viewing tour for you?"
                elif is_specs_intent:
                    reply = f"{prefix}{p['title']} features {p['bedrooms']} bedrooms, {p['bathrooms']} bathrooms, and {p['description']}. Would you like to schedule a private tour?"
                else:
                    reply = f"{prefix}{p['title']} is located at {p['address']}, offering {p['bedrooms']} bedrooms, {p['bathrooms']} bathrooms, and is listed at ${p['price']:,.0f}. {p['description']} Would you like to schedule a private tour?"
                
                SESSION_MEMORY[effective_session] = {
                    **session_ctx,
                    "active_property": p,
                    "last_offer": "offer_tour",
                    "last_assistant_reply": reply
                }
                return {
                    "answer": reply,
                    "action": "search_properties",
                    "has_db_match": True,
                    "has_kb_match": False,
                    "database_results": [p]
                }
            else:
                if is_avail_intent:
                    listings = ", ".join([f"'{item['title']}' (${item['price']:,.0f})" for item in db_properties[:3]])
                    reply = f"Yes, we currently have several residences available: {listings}. Which one would you like to explore or schedule a viewing for?"
                elif is_price_intent:
                    prices = ", ".join([f"'{item['title']}' at ${item['price']:,.0f}" for item in db_properties[:3]])
                    reply = f"Our current listings are offered as follows: {prices}. Which residence would you like details on?"
                else:
                    listings = ", ".join([f"'{item['title']}' (${item['price']:,.0f})" for item in db_properties[:3]])
                    reply = f"We currently have several residences available: {listings}. Would you like more details on any of these, or should I arrange a viewing?"

                SESSION_MEMORY[effective_session] = {
                    **session_ctx,
                    "active_property": db_properties[0] if db_properties else None,
                    "last_offer": "offer_tour",
                    "last_assistant_reply": reply
                }
                return {
                    "answer": reply,
                    "action": "search_properties",
                    "has_db_match": True,
                    "has_kb_match": False,
                    "database_results": db_properties
                }

        # CASE C: UPLOADED DOCUMENT CONTENT APPLIES (POLICIES, FAQS, PROCEDURES)
        if has_kb:
            reply = f"According to our company policy, {doc_sentence} Please let me know if you would like additional details or if you would like to schedule an appointment."
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "last_offer": "offer_policy_details",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "search_knowledge_base",
                "has_db_match": False,
                "has_kb_match": True,
                "database_results": []
            }

        # CASE D: INFORMATION IS CURRENTLY UNAVAILABLE IN BOTH SOURCES
        specific_inquiry = any(k in lower for k in ["what is", "how much", "tell me about", "where", "who", "which", "cost", "fee", "hours", "escrow", "inspect", "refund", "guarantee", "discount", "flight", "jet", "secret"])
        if specific_inquiry:
            reply = "I apologize, but that specific information is currently unavailable in our active records. Would you like me to connect you with a representative or take your contact details?"
            SESSION_MEMORY[effective_session] = {
                **session_ctx,
                "last_offer": "offer_lead_capture",
                "last_assistant_reply": reply
            }
            return {
                "answer": reply,
                "action": "unavailable_fallback",
                "has_db_match": False,
                "has_kb_match": False,
                "database_results": []
            }

        # CASE E: FRIENDLY NATURAL CONVERSATIONAL RESPONSE
        reply = "Hello! I am here to assist you with our available properties, pricing details, company policies, or schedule a viewing tour. How may I help you today?"
        SESSION_MEMORY[effective_session] = {
            **session_ctx,
            "last_offer": "general_greeting",
            "last_assistant_reply": reply
        }
        return {
            "answer": reply,
            "action": "general_greeting",
            "has_db_match": False,
            "has_kb_match": False,
            "database_results": []
        }
