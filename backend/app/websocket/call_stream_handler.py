import asyncio
import json
import base64
from typing import Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.logger import logger
from app.models import Call, Conversation, AIPrompt, CallStatus
from app.telephony.audio_bridge import AudioBridge
from app.stt.deepgram_streaming import DeepgramStreamingSTT
from app.ai.memory_manager import MemoryManager
from app.ai.prompt_manager import PromptManager
from app.ai.gpt4_engine import GPT4ConversationEngine
from app.tts.elevenlabs_streaming import ElevenLabsStreamingTTS
from app.websocket.connection_manager import ws_manager

class CallStreamHandler:
    """Orchestrates real-time audio streaming between Telephony WS, STT, GPT-4, and TTS."""

    def __init__(self, websocket: WebSocket, call_id: str, db: AsyncSession):
        self.websocket = websocket
        self.call_id = call_id
        self.db = db
        self.is_playing_tts = False
        self.current_tts_task: Optional[asyncio.Task] = None

    async def handle(self):
        await self.websocket.accept()
        logger.info(f"WebSocket connected for call_id: {self.call_id}")

        # Fetch call details from DB
        result = await self.db.execute(select(Call).filter(Call.id == self.call_id))
        call = result.scalars().first()
        
        if not call:
            logger.error(f"Call {self.call_id} not found in database. Closing WS.")
            await self.websocket.close(code=4004)
            return

        organization_id = call.organization_id

        # Fetch AI Prompt configuration
        prompt_res = await self.db.execute(
            select(AIPrompt).filter(AIPrompt.organization_id == organization_id)
        )
        ai_prompt = prompt_res.scalars().first()
        industry = ai_prompt.industry if ai_prompt else "real_estate"
        system_prompt = PromptManager.build_system_prompt(
            industry=industry,
            custom_system_prompt=ai_prompt.system_prompt if ai_prompt else None
        )
        greeting = PromptManager.get_greeting(
            industry=industry,
            custom_greeting=ai_prompt.greeting if ai_prompt else None
        )

        # Initialize AI Engine, Memory, STT, TTS
        memory = MemoryManager(system_prompt=system_prompt)
        gpt_engine = GPT4ConversationEngine(memory, self.db, organization_id)
        stt_service = DeepgramStreamingSTT()
        tts_service = ElevenLabsStreamingTTS()

        # Callback when user speech is transcribed by STT
        async def on_user_transcript(transcript: str, is_final: bool):
            if not is_final or not transcript:
                return

            logger.info(f"Call [{self.call_id}] User STT: {transcript}")

            # Interruption handling: cancel ongoing TTS playback if caller speaks
            if self.is_playing_tts and self.current_tts_task:
                logger.info("Interruption detected! Stopping active TTS playback.")
                self.current_tts_task.cancel()
                self.is_playing_tts = False

            # Broadcast user speech to live dashboard
            await ws_manager.broadcast_to_dashboard({
                "type": "transcript",
                "call_id": self.call_id,
                "role": "user",
                "text": transcript
            })

            # Save user conversation turn to DB
            user_conv = Conversation(call_id=call.id, role="user", content=transcript)
            self.db.add(user_conv)
            await self.db.commit()

            # Generate AI Assistant Response and Stream TTS back to Call
            self.current_tts_task = asyncio.create_task(
                self._generate_and_speak_response(transcript, gpt_engine, tts_service, call.id)
            )

        # Connect STT
        await stt_service.connect(on_user_transcript)

        # Send Initial AI Greeting via TTS
        self.current_tts_task = asyncio.create_task(
            self._speak_text(greeting, tts_service, call.id)
        )

        try:
            while True:
                data = await self.websocket.receive_text()
                event = json.loads(data)
                event_type = event.get("event") or event.get("event_type")

                if event_type in ["media", "audio"]:
                    # Telephony media packet payload containing base64 mulaw audio
                    media = event.get("media", {})
                    payload_b64 = media.get("payload") or event.get("payload")

                    if payload_b64:
                        # Convert base64 mulaw -> PCM 16kHz
                        pcm16 = AudioBridge.base64_mulaw_to_pcm16(payload_b64)
                        # Send PCM chunk to Deepgram STT
                        await stt_service.send_audio_chunk(pcm16)

                elif event_type == "stop":
                    logger.info(f"Call stream stopped by provider for call {self.call_id}")
                    break

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for call {self.call_id}")
        except Exception as e:
            logger.error(f"Error handling call WebSocket stream: {e}")
        finally:
            await stt_service.close()
            # Update call status to completed
            call.status = CallStatus.COMPLETED.value
            await self.db.commit()

    async def _generate_and_speak_response(
        self, user_transcript: str, gpt_engine: GPT4ConversationEngine, tts_service: ElevenLabsStreamingTTS, call_id: Any
    ):
        self.is_playing_tts = True
        full_ai_response = ""

        try:
            async for chunk in gpt_engine.generate_response_stream(user_transcript):
                full_ai_response += chunk
                await self._speak_text(chunk, tts_service, call_id)

            if full_ai_response:
                # Save assistant conversation turn to DB
                asst_conv = Conversation(call_id=call_id, role="assistant", content=full_ai_response)
                self.db.add(asst_conv)
                await self.db.commit()

                # Broadcast assistant response to live dashboard
                await ws_manager.broadcast_to_dashboard({
                    "type": "transcript",
                    "call_id": str(call_id),
                    "role": "assistant",
                    "text": full_ai_response
                })
        except asyncio.CancelledError:
            logger.info("TTS Task cancelled due to interruption.")
        finally:
            self.is_playing_tts = False

    async def _speak_text(self, text: str, tts_service: ElevenLabsStreamingTTS, call_id: Any):
        async for mulaw_chunk in tts_service.stream_speech(text):
            b64_payload = base64.b64encode(mulaw_chunk).decode("utf-8")
            media_msg = {
                "event": "media",
                "media": {
                    "payload": b64_payload
                }
            }
            await self.websocket.send_text(json.dumps(media_msg))
