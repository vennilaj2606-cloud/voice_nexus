from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_organization
from app.schemas.rag_schemas import DocumentUploadResponse, RAGQueryRequest, RAGQueryResponse
from app.services.rag_service import RAGService
from app.models import Organization

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base & RAG"])

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Only .pdf, .docx, and .txt files are supported")

    content = await file.read()
    rag_service = RAGService(db, org.id)
    chunks_count = await rag_service.process_document_upload(file.filename, content)

    return DocumentUploadResponse(
        filename=file.filename,
        chunks_processed=chunks_count,
        message="Document successfully processed and indexed into vector knowledge base."
    )

@router.post("/query", response_model=RAGQueryResponse)
async def query_knowledge(
    query_in: RAGQueryRequest,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    rag_service = RAGService(db, org.id)
    results = await rag_service.search_knowledge(query_in.query, query_in.top_k)
    return RAGQueryResponse(results=results)

@router.get("/documents")
async def list_documents(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.future import select
    from app.models import Property

    stmt = select(Property).where(
        Property.organization_id == org.id,
        Property.status == "knowledge_base"
    ).order_by(Property.created_at.desc())
    res = await db.execute(stmt)
    props = res.scalars().all()

    doc_map = {}
    for p in props:
        fname = p.title.replace("Doc: ", "").split(" (Part ")[0]
        if fname not in doc_map:
            doc_map[fname] = {
                "name": fname,
                "chunks": 0,
                "date": p.created_at.strftime("%Y-%m-%d") if p.created_at else "Today"
            }
        doc_map[fname]["chunks"] += 1

    return [
        {
            "name": doc["name"],
            "chunks": f"{doc['chunks']} Chunks",
            "date": doc["date"]
        }
        for doc in doc_map.values()
    ]

@router.delete("/documents/{filename:path}")
async def delete_document(
    filename: str,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import delete
    from app.models import Property

    stmt = delete(Property).where(
        Property.organization_id == org.id,
        Property.status == "knowledge_base",
        Property.title.like(f"Doc: {filename}%")
    )
    result = await db.execute(stmt)
    await db.commit()

    return {
        "status": "success",
        "deleted_chunks": result.rowcount,
        "message": f"Document '{filename}' successfully removed from vector knowledge base."
    }
