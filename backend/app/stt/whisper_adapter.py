import httpx
from typing import Callable, Awaitable, Optional
from app.stt.base import BaseSTTService
from app.core.config import settings
from app.core.logger import logger

class WhisperSTT(BaseSTTService):
    """Whisper API adapter for non-streaming / fallback transcription."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.is_connected = False
        self.audio_buffer = bytearray()
        self.callback: Optional[Callable[[str, bool], Awaitable[None]]] = None

    async def connect(self, on_transcript_callback: Callable[[str, bool], Awaitable[None]]):
        self.callback = on_transcript_callback
        self.is_connected = True
        logger.info("Initialized Whisper STT buffer")

    async def send_audio_chunk(self, pcm_chunk: bytes):
        if not self.is_connected:
            return
        self.audio_buffer.extend(pcm_chunk)
        
        # When buffer reaches ~3 seconds of audio (96000 bytes at 16kHz 16-bit mono)
        if len(self.audio_buffer) >= 96000:
            audio_data = bytes(self.audio_buffer)
            self.audio_buffer.clear()
            asyncio.create_task(self._transcribe_buffer(audio_data))

    async def _transcribe_buffer(self, audio_data: bytes):
        if not self.api_key or self.api_key == "sk-proj-mock-key-for-development":
            if self.callback:
                await self.callback("[Mock Whisper Transcript]", True)
            return

        try:
            async with httpx.AsyncClient() as client:
                files = {"file": ("audio.wav", audio_data, "audio/wav")}
                data = {"model": "whisper-1"}
                headers = {"Authorization": f"Bearer {self.api_key}"}
                res = await client.post("https://api.openai.com/v1/audio/transcriptions", headers=headers, data=data, files=files)
                if res.status_code == 200:
                    text = res.json().get("text", "")
                    if text and self.callback:
                        await self.callback(text, True)
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")

    async def close(self):
        self.is_connected = False
        self.audio_buffer.clear()
