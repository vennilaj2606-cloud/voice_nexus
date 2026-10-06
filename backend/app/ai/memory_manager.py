from typing import List, Dict, Any

class MemoryManager:
    """Manages short-term conversation context memory for real-time speech dialogue."""

    def __init__(self, system_prompt: str, max_messages: int = 12):
        self.system_prompt = system_prompt
        self.max_messages = max_messages
        self.messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]

    def add_user_message(self, content: str):
        self.messages.append({"role": "user", "content": content})
        self._trim_history()

    def add_assistant_message(self, content: str):
        self.messages.append({"role": "assistant", "content": content})
        self._trim_history()

    def add_tool_message(self, tool_call_id: str, content: str):
        self.messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": content
        })
        self._trim_history()

    def add_raw_message(self, message_obj: Dict[str, Any]):
        self.messages.append(message_obj)
        self._trim_history()

    def get_messages(self) -> List[Dict[str, Any]]:
        return self.messages

    def _trim_history(self):
        """Keep the system prompt at index 0 and retain the most recent N conversation turns."""
        if len(self.messages) > self.max_messages + 1:
            # Preserve index 0 (system prompt) and slice last max_messages
            self.messages = [self.messages[0]] + self.messages[-self.max_messages:]
