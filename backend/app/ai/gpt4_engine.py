import json
from typing import AsyncGenerator, Optional, Dict, Any
import openai
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import logger
from app.ai.memory_manager import MemoryManager
from app.ai.tools_definition import AI_TOOLS
from app.ai.tool_executor import ToolExecutor

class GPT4ConversationEngine:
    """Core AI Engine using GPT-4 with streaming audio response and function calling execution."""

    def __init__(self, memory_manager: MemoryManager, db: AsyncSession, organization_id: Any):
        self.memory = memory_manager
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.executor = ToolExecutor(db, organization_id)

    async def generate_response_stream(self, user_transcript: str) -> AsyncGenerator[str, None]:
        """Add user message, handle potential tool execution, and yield assistant response text chunks."""
        self.memory.add_user_message(user_transcript)

        # Fallback / offline mode: Execute real 2-way knowledge base search, property search, and actions
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-proj-mock-key-for-development":
            txt_lower = user_transcript.lower()

            # 1. Search knowledge base for policies, FAQs, guidelines, or procedures
            kb_summary = ""
            kb_res_text = await self.executor.execute_tool("search_knowledge_base", json.dumps({"query": user_transcript}))
            try:
                kb_data = json.loads(kb_res_text)
                kb_results = kb_data.get("results", [])
                if kb_results and kb_results[0].get("similarity", 0) > 0.65:
                    top_chunk = kb_results[0].get("content", "").strip()
                    # Clean chunk into short sentence
                    first_sentence = top_chunk.split(".")[0] + "." if "." in top_chunk else top_chunk[:160] + "..."
                    kb_summary = f"According to our company policy, {first_sentence}"
            except Exception:
                pass

            # 2. Check for dynamic property information
            has_property_intent = any(k in txt_lower for k in ["house", "property", "buy", "price", "bedroom", "looking for", "search", "list", "villa", "penthouse", "cost"])
            prop_summary = ""

            if has_property_intent:
                tool_res_text = await self.executor.execute_tool("search_properties", json.dumps({"query": user_transcript}))
                try:
                    res_data = json.loads(tool_res_text)
                    results = res_data.get("results", [])
                    if results:
                        items_str = ", ".join([f"'{p['title']}' at {p['address']} (${p['price']:,.0f})" for p in results[:2]])
                        prop_summary = f"We currently have {items_str} available"
                    else:
                        prop_summary = "We do not have an exact property match currently available, but our team can notify you as soon as one arrives"
                except Exception:
                    pass

            # 3. Combine both sources or return the most relevant answer
            if kb_summary and prop_summary:
                mock_resp = f"{kb_summary} In addition, {prop_summary}. Would you like me to schedule a private viewing for you?"
            elif kb_summary:
                mock_resp = f"{kb_summary} Please let me know if you would like more details or if you would like to schedule an agent consultation."
            elif prop_summary:
                mock_resp = f"{prop_summary}. Would you like me to book a private viewing tour for you?"
            elif any(k in txt_lower for k in ["book", "appointment", "schedule", "viewing", "tour", "meet", "visit"]):
                await self.executor.execute_tool("book_appointment", json.dumps({
                    "customer_name": "Caller",
                    "customer_phone": "+15550192834",
                    "start_time": "2026-10-05T14:00:00",
                    "title": "Property Viewing Appointment",
                    "notes": f"Requested during live call: {user_transcript}"
                }))
                mock_resp = "I have scheduled a private viewing appointment for you tomorrow at 2:00 PM and reserved your time slot."
            elif any(k in txt_lower for k in ["lead", "contact", "my name is", "email", "phone", "number", "save"]):
                await self.executor.execute_tool("save_lead", json.dumps({
                    "name": "Live Caller",
                    "phone": "+15550192834",
                    "notes": user_transcript
                }))
                mock_resp = "Thank you! I have updated your contact details and preferences in our client records."
            else:
                mock_resp = f"Thank you for asking about that. I can assist you with our available properties, pricing specifications, company policies, or schedule an in-person viewing tour for you. What would you like to explore?"

            self.memory.add_assistant_message(mock_resp)
            yield mock_resp
            return


        try:
            # 1. First completion call with tools enabled
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=self.memory.get_messages(),
                tools=AI_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                stream=False
            )

            message = response.choices[0].message

            # 2. Handle Tool Calls if generated by GPT-4
            if message.tool_calls:
                # Add assistant tool call request to memory
                self.memory.add_raw_message(message.model_dump())

                for tool_call in message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = tool_call.function.arguments
                    tool_result = await self.executor.execute_tool(fn_name, fn_args)
                    self.memory.add_tool_message(tool_call.id, tool_result)

                # Stream final response after tool execution
                stream = await self.client.chat.completions.create(
                    model=self.model,
                    messages=self.memory.get_messages(),
                    temperature=0.7,
                    stream=True
                )
                
                full_text = ""
                async for chunk in stream:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        full_text += content
                        yield content

                if full_text:
                    self.memory.add_assistant_message(full_text)
            else:
                # No tool calls: Stream direct assistant response
                full_text = message.content or ""
                self.memory.add_assistant_message(full_text)
                yield full_text

        except Exception as e:
            logger.error(f"GPT-4 Conversation Engine error: {e}")
            fallback = "I apologize, I experienced a brief processing interruption. Could you please repeat that?"
            yield fallback
