# OpenAI Function Calling Tools Definition for Voice AI Agent

AI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_properties",
            "description": "Search available real estate properties by price range, location keyword, or bedroom count.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Location or keyword search query"},
                    "max_price": {"type": "number", "description": "Maximum budget price in USD"},
                    "min_bedrooms": {"type": "integer", "description": "Minimum number of bedrooms required"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Check if a date and time slot is available for an appointment or viewing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_time": {"type": "string", "description": "Desired appointment date/time ISO format (e.g. 2026-10-01T14:00:00)"}
                },
                "required": ["start_time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Schedule a property viewing, consultation, or test drive appointment for a caller.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Full name of the caller"},
                    "customer_phone": {"type": "string", "description": "Phone number of the caller"},
                    "start_time": {"type": "string", "description": "ISO start datetime string (e.g. 2026-10-01T14:00:00)"},
                    "title": {"type": "string", "description": "Short title or reason for appointment"},
                    "notes": {"type": "string", "description": "Additional notes or preferences"}
                },
                "required": ["customer_name", "customer_phone", "start_time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_lead",
            "description": "Save or update caller contact information into the CRM lead database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Lead full name"},
                    "phone": {"type": "string", "description": "Lead phone number"},
                    "email": {"type": "string", "description": "Lead email address"},
                    "notes": {"type": "string", "description": "Call notes or requirements"}
                },
                "required": ["name", "phone"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "transfer_to_human",
            "description": "Transfer the caller to a live human agent specialist.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Reason for transferring to a human specialist"}
                },
                "required": ["reason"]
            }
        }
    }
]
