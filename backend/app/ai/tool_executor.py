import json
from datetime import datetime, timedelta
from typing import Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import Property, Lead, Customer, Appointment, AppointmentStatus, LeadStatus
from app.core.logger import logger

class ToolExecutor:
    """Executes structured AI function calls against the database."""

    def __init__(self, db: AsyncSession, organization_id: UUID):
        self.db = db
        self.organization_id = organization_id

    async def execute_tool(self, function_name: str, arguments_json: str) -> str:
        try:
            args = json.loads(arguments_json)
        except Exception:
            args = {}

        logger.info(f"Executing AI Tool '{function_name}' with args: {args}")

        if function_name == "search_properties":
            return await self._search_properties(args)
        elif function_name == "check_availability":
            return await self._check_availability(args)
        elif function_name == "book_appointment":
            return await self._book_appointment(args)
        elif function_name == "save_lead":
            return await self._save_lead(args)
        elif function_name == "search_knowledge_base":
            return await self._search_knowledge_base(args)
        elif function_name == "transfer_to_human":
            return json.dumps({"status": "transfer_initiated", "reason": args.get("reason", "Caller request")})
        else:
            return json.dumps({"error": f"Unknown tool: {function_name}"})

    async def _search_knowledge_base(self, args: Dict[str, Any]) -> str:
        query = args.get("query", "")
        if not query:
            return json.dumps({"results": [], "message": "No query provided."})
        from app.services.rag_service import RAGService
        rag = RAGService(self.db, self.organization_id)
        results = await rag.search_knowledge(query, top_k=3)
        return json.dumps({
            "results": results,
            "count": len(results)
        })

    async def _search_properties(self, args: Dict[str, Any]) -> str:
        query = select(Property).filter(Property.organization_id == self.organization_id)

        if "max_price" in args and args["max_price"]:
            query = query.filter(Property.price <= float(args["max_price"]))
        if "min_bedrooms" in args and args["min_bedrooms"]:
            query = query.filter(Property.bedrooms >= int(args["min_bedrooms"]))

        result = await self.db.execute(query.limit(5))
        properties = result.scalars().all()

        if not properties:
            return json.dumps({"results": [], "message": "No properties found matching criteria."})

        data = [
            {
                "id": str(p.id),
                "title": p.title,
                "address": p.address,
                "price": p.price,
                "bedrooms": p.bedrooms,
                "bathrooms": p.bathrooms,
                "status": p.status
            }
            for p in properties
        ]
        return json.dumps({"results": data})

    async def _check_availability(self, args: Dict[str, Any]) -> str:
        start_str = args.get("start_time")
        if not start_str:
            return json.dumps({"available": False, "error": "start_time is required"})

        try:
            start_time = datetime.fromisoformat(start_str.replace("Z", ""))
        except ValueError:
            return json.dumps({"available": False, "error": "Invalid date format. Use ISO format."})

        end_time = start_time + timedelta(minutes=45)

        # Query existing appointments in org for overlapping times
        query = select(Appointment).filter(
            Appointment.organization_id == self.organization_id,
            Appointment.status != AppointmentStatus.CANCELLED.value,
            Appointment.start_time < end_time,
            Appointment.end_time > start_time
        )
        res = await self.db.execute(query)
        existing = res.scalars().first()

        if existing:
            return json.dumps({"available": False, "message": f"Slot at {start_str} is already booked."})
        
        return json.dumps({"available": True, "message": f"Slot at {start_str} is available!"})

    async def _book_appointment(self, args: Dict[str, Any]) -> str:
        customer_name = args.get("customer_name")
        customer_phone = args.get("customer_phone")
        start_str = args.get("start_time")
        title = args.get("title", "Voice AI Appointment")
        notes = args.get("notes", "")

        try:
            start_time = datetime.fromisoformat(start_str.replace("Z", ""))
        except Exception:
            start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(minutes=45)

        # Check or create Lead
        lead_query = select(Lead).filter(
            Lead.organization_id == self.organization_id,
            Lead.phone == customer_phone
        )
        res = await self.db.execute(lead_query)
        lead = res.scalars().first()

        if not lead:
            lead = Lead(
                organization_id=self.organization_id,
                name=customer_name,
                phone=customer_phone,
                status=LeadStatus.APPOINTMENT_SCHEDULED.value,
                notes=f"Created via Voice Call. Appointment: {title}"
            )
            self.db.add(lead)
            await self.db.flush()
        else:
            lead.status = LeadStatus.APPOINTMENT_SCHEDULED.value

        # Create Appointment
        appt = Appointment(
            organization_id=self.organization_id,
            lead_id=lead.id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            status=AppointmentStatus.SCHEDULED.value,
            notes=notes
        )
        self.db.add(appt)
        await self.db.commit()

        return json.dumps({
            "status": "success",
            "appointment_id": str(appt.id),
            "message": f"Appointment booked for {customer_name} at {start_time.strftime('%Y-%m-%d %H:%M')}!"
        })

    async def _save_lead(self, args: Dict[str, Any]) -> str:
        name = args.get("name")
        phone = args.get("phone")
        email = args.get("email")
        notes = args.get("notes")

        lead_query = select(Lead).filter(
            Lead.organization_id == self.organization_id,
            Lead.phone == phone
        )
        res = await self.db.execute(lead_query)
        lead = res.scalars().first()

        if not lead:
            lead = Lead(
                organization_id=self.organization_id,
                name=name,
                phone=phone,
                email=email,
                notes=notes
            )
            self.db.add(lead)
        else:
            lead.name = name
            if email: lead.email = email
            if notes: lead.notes = (lead.notes or "") + f"\n{notes}"

        await self.db.commit()
        return json.dumps({"status": "success", "lead_id": str(lead.id), "message": "Lead details saved to CRM."})
