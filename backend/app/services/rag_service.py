import io
import openai
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from pypdf import PdfReader
from docx import Document as DocxReader

from app.core.config import settings
from app.core.logger import logger
from app.models import Property

class RAGService:
    """RAG & Business Vector Search Service using OpenAI embeddings and PostgreSQL pgvector."""

    def __init__(self, db: AsyncSession, organization_id: UUID):
        self.db = db
        self.organization_id = organization_id
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def get_embedding(self, text: str) -> List[float]:
        """Generate embedding vector using OpenAI API."""
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-proj-mock-key-for-development":
            # Return dummy 1536-dimensional vector for local testing
            return [0.0] * 1536

        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return [0.0] * 1536

    async def process_document_upload(self, filename: str, content_bytes: bytes) -> int:
        text_content = ""
        if filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content_bytes))
            for page in reader.pages:
                text_content += page.extract_text() or ""
        elif filename.endswith(".docx"):
            doc = DocxReader(io.BytesIO(content_bytes))
            for p in doc.paragraphs:
                text_content += p.text + "\n"
        else:
            text_content = content_bytes.decode("utf-8", errors="ignore")

        # Split into ~500 char chunks with overlap
        chunks = self._chunk_text(text_content, chunk_size=500, overlap=50)

        for idx, chunk in enumerate(chunks):
            embedding = await self.get_embedding(chunk)
            # Store chunk as property/knowledge item in DB
            prop = Property(
                organization_id=self.organization_id,
                title=f"Doc: {filename} (Part {idx+1})",
                address="Knowledge Base Document",
                price=0.0,
                bedrooms=0,
                bathrooms=0.0,
                status="knowledge_base",
                description=chunk,
                embedding=embedding
            )
            self.db.add(prop)

        await self.db.commit()
        return len(chunks)

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    async def search_knowledge(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        query_words = [w.lower() for w in query.split() if len(w) > 2]
        has_real_ai = settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-proj-mock-key-for-development"

        stmt = select(Property).where(Property.organization_id == self.organization_id)

        if has_real_ai and hasattr(Property.embedding, "cosine_distance"):
            try:
                query_embedding = await self.get_embedding(query)
                stmt = stmt.where(Property.embedding.isnot(None)).order_by(
                    Property.embedding.cosine_distance(query_embedding)
                )
            except Exception as e:
                logger.warning(f"Vector search failed, falling back to keyword ranking: {e}")
        else:
            stmt = stmt.order_by(
                (Property.status == "knowledge_base").desc(),
                Property.created_at.desc()
            )

        res = await self.db.execute(stmt.limit(20))
        all_items = res.scalars().all()

        def score_item(item: Property) -> float:
            score = 0.5
            text = f"{item.title} {item.description}".lower()
            if item.status == "knowledge_base":
                score += 0.25
            for word in query_words:
                if word in text:
                    score += 0.2
            return min(score, 0.99)

        scored_items = sorted(all_items, key=score_item, reverse=True)[:top_k]

        return [
            {
                "title": item.title,
                "content": item.description,
                "similarity": round(score_item(item), 2)
            }
            for item in scored_items
        ]
