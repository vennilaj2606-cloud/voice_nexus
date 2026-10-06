import asyncio
import json
import websockets
from typing import Callable, Awaitable, Optional
from app.stt.base import BaseSTTService
from app.core.config import settings
from app.core.logger import logger

class DeepgramStreamingSTT(BaseSTTService):

    def __init__(self, api_key: Optional[str] = None, model: str = "nova-2", language: str = "en-US"):
        self.api_key = api_key or settings.DEEPGRAM_API_KEY
        self.model = model
        self.language = language
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.is_connected = False
        self.listen_task: Optional[asyncio.Task] = None
        self.callback: Optional[Callable[[str, bool], Awaitable[None]]] = None

    async def connect(self, on_transcript_callback: Callable[[str, bool], Awaitable[None]]):
        self.callback = on_transcript_callback
        
        # If API key is mock or missing, fallback gracefully to mock stream simulator for testing
        if not self.api_key or self.api_key == "mock-deepgram-key":
            logger.info("Using Deepgram Mock Stream Mode")
            self.is_connected = True
            return

        url = (
            f"wss://api.deepgram.com/v1/listen?"
            f"model={self.model}&language={self.language}&encoding=linear16&sample_rate=16000"
            f"&interim_results=true&endpointing=300&vad_events=true"
        )
        headers = {"Authorization": f"Token {self.api_key}"}

        try:
            self.ws = await websockets.connect(url, extra_headers=headers)
            self.is_connected = True
            logger.info("Connected to Deepgram WebSocket streaming API")
            self.listen_task = asyncio.create_task(self._listen_loop())
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram STT: {e}")
            self.is_connected = False

    async def _listen_loop(self):
        try:
            while self.is_connected and self.ws:
                msg = await self.ws.recv()
                data = json.loads(msg)
                
                # Check for transcript channel results
                channel = data.get("channel", {})
                alternatives = channel.get("alternatives", [])
                if alternatives:
                    transcript = alternatives[0].get("transcript", "").strip()
                    is_final = data.get("is_final", False)
                    speech_final = data.get("speech_final", False)
                    
                    if transcript and self.callback:
                        await self.callback(transcript, is_final or speech_final)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Deepgram WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error in Deepgram listener loop: {e}")
        finally:
            self.is_connected = False

    async def send_audio_chunk(self, pcm_chunk: bytes):
        if not self.is_connected:
            return
            
        if self.ws:
            try:
                await self.ws.send(pcm_chunk)
            except Exception as e:
                logger.error(f"Error sending audio chunk to Deepgram: {e}")

    async def close(self):
        self.is_connected = False
        if self.listen_task:
            self.listen_task.cancel()
        if self.ws:
            await self.ws.close()
            logger.info("Deepgram WebSocket connection closed cleanly")
