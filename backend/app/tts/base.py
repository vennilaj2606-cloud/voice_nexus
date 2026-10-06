from abc import ABC, abstractmethod
from typing import AsyncGenerator

class BaseTTSService(ABC):

    @abstractmethod
    async def stream_speech(self, text: str, voice_id: str) -> AsyncGenerator[bytes, None]:
        """Stream PCM or audio bytes generated from text."""
        pass
