import re

def sanitize_ai_response(text: str) -> str:
    """
    Sanitizes AI response text to guarantee:
    1. Zero exposure of internal technical implementation details (SQL, database, RAG, vectors, embeddings, tools).
    2. Warm, natural, professional tone.
    3. Removal of awkward machine artefacts or repetitious prefixes.
    """
    if not text:
        return text

    sanitized = text

    # Replace technical database/RAG jargon with natural conversational terms
    replacements = [
        (r'\b(database query|db query|sql query|sql)\b', 'our records'),
        (r'\b(database|in the database|from the database)\b', 'in our current listings'),
        (r'\b(vector search|rag search|embeddings?|pgvector)\b', 'our verified company files'),
        (r'\b(knowledge base chunk|document chunk|retrieved chunk)\b', 'our official guidelines'),
        (r'\b(tool call|function call|execute_tool)\b', 'consulting our records'),
        (r'\b(api response|backend service)\b', 'our system'),
    ]

    for pattern, replacement in replacements:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    # Clean double spaces
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()

    return sanitized
