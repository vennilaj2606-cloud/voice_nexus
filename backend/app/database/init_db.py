from sqlalchemy.sql import text
from app.database.session import engine, Base
from app.core.logger import logger
import app.models  # load models

async def init_db():
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        # Create pgvector extension if not exists
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            logger.info("pgvector extension enabled.")
        except Exception as e:
            logger.warning(f"Could not enable pgvector extension (might need superuser): {e}")

        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")

    # Seed sample records if database is empty
    from app.database.session import AsyncSessionLocal
    from app.models import Organization, Property, AIPrompt
    from sqlalchemy.future import select

    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization))
        existing_org = org_res.scalars().first()
        if not existing_org:
            logger.info("Seeding initial default organization and sample data...")
            org = Organization(
                name="Nexus Real Estate Solutions",
                slug="nexus-real-estate",
                api_key="vn_live_default_org_key_2026"
            )
            session.add(org)
            await session.flush()

            # Seed sample properties for live queries
            p1 = Property(
                organization_id=org.id,
                title="Sunset Modern Villa",
                address="742 Evergreen Terrace, Beverly Hills, CA",
                price=1250000.0,
                bedrooms=4,
                bathrooms=3.5,
                status="available",
                description="Luxury 4-bedroom villa featuring panoramic ocean views, private infinity pool, and smart home integration."
            )
            p2 = Property(
                organization_id=org.id,
                title="Downtown Luxury Penthouse",
                address="100 Financial Center Blvd, San Francisco, CA",
                price=2100000.0,
                bedrooms=3,
                bathrooms=3.0,
                status="available",
                description="High-rise penthouse in downtown core with floor-to-ceiling windows, private elevator access, and concierge service."
            )
            p3 = Property(
                organization_id=org.id,
                title="Cozy Suburban Family Home",
                address="124 Maple Street, Austin, TX",
                price=550000.0,
                bedrooms=3,
                bathrooms=2.0,
                status="available",
                description="Charming 3-bedroom family residence with a spacious backyard, newly renovated kitchen, and top-rated school district."
            )
            session.add_all([p1, p2, p3])

            prompt = AIPrompt(
                organization_id=org.id,
                name="Real Estate Sales Assistant",
                industry="real_estate",
                system_prompt="You are a professional real estate voice assistant. Search properties, check viewing availability, and book appointments for callers.",
                greeting="Hello! Thank you for calling VoiceNexus Real Estate. How can I help you find your dream property today?",
                is_default=True
            )
            session.add(prompt)
            await session.commit()
            logger.info("Initial seed data successfully created!")

    async with AsyncSessionLocal() as session:
        from app.models import User, UserRole
        from app.core.security import get_password_hash

        user_res = await session.execute(select(User).filter(User.email == "admin@apexrealty.com"))
        if not user_res.scalars().first():
            org_res = await session.execute(select(Organization))
            org_to_use = org_res.scalars().first()
            if org_to_use:
                logger.info("Seeding default admin user: admin@apexrealty.com...")
                admin_user = User(
                    organization_id=org_to_use.id,
                    email="admin@apexrealty.com",
                    password_hash=get_password_hash("password123"),
                    full_name="Apex Admin",
                    role=UserRole.ADMIN.value,
                    is_active=True
                )
                session.add(admin_user)
                await session.commit()
                logger.info("Default admin user created successfully!")

