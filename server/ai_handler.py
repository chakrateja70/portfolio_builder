"""
ai_handler.py - AI features using Groq LLM

This module handles TWO AI modes:

1. Q&A Mode:
   - User asks any question
   - Groq (LLaMA model) answers it
   - Great for learning, resume tips, career advice, etc.

2. Personal Assistant Mode:
   - User types natural language commands like "update my name to Teja"
   - Groq extracts the intent and field to update
   - We validate before making any database changes
"""

import json
import re
from groq import Groq
from config import GROQ_API_KEY
from db import execute_query

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# The AI model we'll use (fast and free on Groq)
MODEL = "llama-3.1-8b-instant"


# ==================== MODE 1: Q&A CHATBOT ====================

def ask_question(user_question):
    """
    Send any question to Groq and get an answer.

    Parameters:
        user_question : str - The question from the user

    Returns:
        str - The AI's answer
    """
    if not user_question.strip():
        return "Please enter a question."

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant for students building their portfolio. "
                        "Help with career advice, resume tips, project ideas, and general coding questions. "
                        "Keep answers clear and concise."
                    )
                },
                {
                    "role": "user",
                    "content": user_question
                }
            ],
            max_tokens=500
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        return f"AI error: {str(e)}"


# ==================== MODE 2: PERSONAL ASSISTANT ====================

# These are the fields the assistant is ALLOWED to update
# Key = field name the AI can reference, Value = (table, column) to update
ALLOWED_FIELDS = {
    "name":       ("basic_details", "full_name"),
    "full_name":  ("basic_details", "full_name"),
    "phone":      ("basic_details", "phone"),
    "bio":        ("basic_details", "bio"),
    "location":   ("basic_details", "location"),
    "github":     ("links", "github_url"),
    "linkedin":   ("links", "linkedin_url"),
    "portfolio":  ("links", "portfolio_url"),
}


def parse_update_intent(user_prompt):
    """
    Send the user's natural language command to Groq and get back
    a structured JSON response telling us WHAT to update and the NEW VALUE.

    Example input:  "update my name to Teja"
    Example output: {"field": "name", "new_value": "Teja"}

    Returns:
        dict with keys "field" and "new_value", or None if parsing failed
    """
    system_prompt = f"""
You are a JSON extractor. The user wants to update their portfolio profile.
Extract WHAT field they want to update and the NEW VALUE they want to set.

Allowed fields: {", ".join(ALLOWED_FIELDS.keys())}

Return ONLY a valid JSON object in this exact format:
{{"field": "<field_name>", "new_value": "<new_value>"}}

If you cannot understand the command, return:
{{"field": null, "new_value": null}}

Do NOT include any explanation or extra text. Only return the JSON.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=100
        )
        raw = response.choices[0].message.content.strip()

        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data
        return None

    except Exception as e:
        return None


def run_personal_assistant(user_id, user_prompt):
    """
    Process a natural language update command and apply it to the database.

    Steps:
        1. Parse the user's intent (what field, what value)
        2. Validate the field and value
        3. Update the correct table in the database

    Parameters:
        user_id     : int - The logged-in user's ID
        user_prompt : str - The natural language command

    Returns:
        (success: bool, message: str)
    """
    if not user_prompt.strip():
        return False, "Please enter a command."

    # Step 1: Parse intent using Groq
    intent = parse_update_intent(user_prompt)

    if not intent or not intent.get("field") or not intent.get("new_value"):
        return False, (
            "Sorry, I couldn't understand that command. "
            "Try something like: 'update my name to John' or 'set my github to https://github.com/john'"
        )

    field = intent["field"].lower().strip()
    new_value = intent["new_value"].strip()

    # Step 2: Validate field is allowed
    if field not in ALLOWED_FIELDS:
        return False, (
            f"I can't update '{field}'. "
            f"Allowed fields: {', '.join(ALLOWED_FIELDS.keys())}"
        )

    # Step 3: Validate the new value is not empty
    if not new_value:
        return False, "The new value cannot be empty."

    # Extra validation for URLs
    url_fields = ["github", "linkedin", "portfolio"]
    if field in url_fields:
        if not new_value.startswith("http"):
            return False, f"Please provide a valid URL starting with http:// or https://"

    # Extra validation for phone number
    if field == "phone":
        digits_only = re.sub(r'\D', '', new_value)
        if len(digits_only) < 7 or len(digits_only) > 15:
            return False, "Please enter a valid phone number."

    # Step 4: Get the correct table and column
    table, column = ALLOWED_FIELDS[field]

    # Step 5: Update database
    try:
        if table == "basic_details":
            # Use INSERT ... ON CONFLICT to handle both new and existing rows
            execute_query(
                f"""
                INSERT INTO basic_details (user_id, {column}, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_id)
                DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()
                """,
                (user_id, new_value)
            )
        elif table == "links":
            execute_query(
                f"""
                INSERT INTO links (user_id, {column}, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_id)
                DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()
                """,
                (user_id, new_value)
            )

        return True, f"✅ Successfully updated your {field} to: {new_value}"

    except Exception as e:
        return False, f"Database error: {str(e)}"
