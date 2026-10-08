import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import AsyncSessionLocal
from app.models import Organization, User, AIPrompt, Property, UserRole
from app.core.security import get_password_hash
from app.prompts.templates import PROMPT_TEMPLATES

async def seed_data():
    print("Seeding initial R4R AI demonstration data...")
    async with AsyncSessionLocal() as db:
        # Create Demo Organization
        org = Organization(
            name="Apex Realty International",
            slug="apex-realty",
            api_key="vn_live_demo_key_apex_realty_2026",
            settings={"default_voice": "21m00Tcm4TlvDq8ikWAM", "stt_provider": "deepgram"}
        )
        db.add(org)
        await db.flush()

        # Create Admin User
        user = User(
            organization_id=org.id,
            email="admin@apexrealty.com",
            password_hash=get_password_hash("password123"),
            full_name="Apex Admin",
            role=UserRole.ADMIN.value,
            is_active=True
        )
        db.add(user)

        # Create Default Real Estate AI Prompt
        prompt = AIPrompt(
            organization_id=org.id,
            name="Apex Realty Sales Assistant",
            industry="real_estate",
            system_prompt=PROMPT_TEMPLATES["real_estate"]["system_prompt"],
            greeting=PROMPT_TEMPLATES["real_estate"]["greeting"],
            is_default=True
        )
        db.add(prompt)

        # Create Demo Real Estate Properties
        p1 = Property(
            organization_id=org.id,
            title="Luxury Sunset Villa",
            address="1244 Grand Avenue, Beverly Hills, CA",
            price=1250000.0,
            bedrooms=4,
            bathrooms=3.5,
            status="available",
            description="Stunning contemporary villa featuring panoramic ocean views, private infinity pool, and smart home automation."
        )
        p2 = Property(
            organization_id=org.id,
            title="Modern Downtown Loft",
            address="788 Broadway, Suite 402, New York, NY",
            price=680000.0,
            bedrooms=2,
            bathrooms=2.0,
            status="available",
            description="Spacious loft with high ceilings, exposed brick walls, updated stainless appliances, and private balcony."
        )
        db.add_all([p1, p2])

        await db.commit()
        print("Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
