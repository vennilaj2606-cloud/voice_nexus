from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class DocumentUploadResponse(BaseModel):
    filename: str
    chunks_processed: int
    message: str

class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 3

class RAGQueryResult(BaseModel):
    title: Optional[str] = None
    content: str
    similarity: float

class RAGQueryResponse(BaseModel):
    results: List[RAGQueryResult]
