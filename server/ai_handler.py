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
                        "You are a helpful and professional career assistant for students. "
                        "Provide clear, accurate, and insightful answers to their questions about "
                        "coding, resume building, and project ideas. While being efficient, ensure "
                        "your tone is supportive and encouraging. If providing code, explain it "
                        "briefly so the user understands the logic."
                    )
                },
                {
                    "role": "user",
                    "content": user_question
                }
            ],
            
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
        You are a JSON extractor for a portfolio builder app. The user wants to update their profile or add new items.
        
        Determine the ACTION ("update" for existing singleton fields, or "add" for lists like skills, experience, projects, achievements).
        NOTE: Even if the user says "update my skill" or "add a skill", use the "add" action for skills, projects, experience, and achievements!

        If action is "update":
        Extract WHAT field they want to update and the NEW VALUE.
        Allowed fields for "update": {", ".join(ALLOWED_FIELDS.keys())}

        If action is "add":
        Extract the "table" (one of: "skills", "projects", "experience", "achievements") and the "data" object containing the fields.
        - For skills: need "skill_name". Also extract "level" (Beginner, Intermediate, Expert). If user doesn't mention level, default to "Beginner".
        - For projects: need "title". Optional: "description", "tech_stack", "project_url".
        - For experience: need "company" and "role". Optional: "duration", "description".
        - For achievements: need "title". Optional: "description", "date_earned".

        If required information is missing (e.g., trying to add experience without a company), return action as "missing_info" and put a helpful question in "message".

        Return ONLY a valid JSON object.
        Examples:
        {{"action": "update", "field": "name", "new_value": "Teja"}}
        {{"action": "add", "table": "skills", "data": {{"skill_name": "Python", "level": "Beginner"}}}}
        {{"action": "add", "table": "projects", "data": {{"title": "Chat App", "description": "Built with Python"}}}}
        {{"action": "missing_info", "message": "What company was this experience at?"}}
        
        CRITICAL NEGATIVE EXAMPLE:
        DO NOT map "update my llm skill" to {{"action": "update", "field": "name"}}. You MUST treat it as a skill addition: {{"action": "add", "table": "skills", "data": {{"skill_name": "llm", "level": "Beginner"}}}}
        
        If you cannot understand, return: {{"action": "unknown"}}
        Do NOT include any explanation or extra text. Only return the JSON.
    """

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],

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

    if not intent or intent.get("action") == "unknown":
        return False, "Sorry, I couldn't understand that command. Try something like 'add Python as a beginner skill' or 'update my name to John'."

    action = intent.get("action")

    if action == "missing_info":
        return False, intent.get("message", "Please provide more details.")

    if action == "update":
        field = intent.get("field", "").lower().strip()
        new_value = intent.get("new_value", "").strip()

        # Validate field is allowed
        if field not in ALLOWED_FIELDS:
            return False, f"I can't update '{field}'. Allowed fields: {', '.join(ALLOWED_FIELDS.keys())}"

        if not new_value:
            return False, "The new value cannot be empty."

        # Extra validation for URLs
        url_fields = ["github", "linkedin", "portfolio"]
        if field in url_fields and not new_value.startswith(("http", "https", "www")):
            return False, "Please provide a valid URL starting with http://, https://, or www."

        # Extra validation for phone number
        if field == "phone":
            digits_only = re.sub(r'\D', '', new_value)
            if len(digits_only) < 7 or len(digits_only) > 15:
                return False, "Please enter a valid phone number."

        table, column = ALLOWED_FIELDS[field]

        try:
            if table == "basic_details":
                execute_query(
                    f"INSERT INTO basic_details (user_id, {column}, updated_at) VALUES (%s, %s, NOW()) ON CONFLICT (user_id) DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()",
                    (user_id, new_value)
                )
            elif table == "links":
                execute_query(
                    f"INSERT INTO links (user_id, {column}, updated_at) VALUES (%s, %s, NOW()) ON CONFLICT (user_id) DO UPDATE SET {column} = EXCLUDED.{column}, updated_at = NOW()",
                    (user_id, new_value)
                )
            return True, f"Successfully updated your {field} to: {new_value}"

        except Exception as e:
            return False, f"Database error updating {field}: {str(e)}"

    elif action == "add":
        table = intent.get("table")
        data = intent.get("data", {})

        try:
            if table == "skills":
                skill_name = data.get("skill_name")
                level = data.get("level", "Beginner").capitalize()
                
                # Make sure level is valid
                if level not in ["Beginner", "Intermediate", "Expert"]:
                    level = "Beginner"

                execute_query(
                    "INSERT INTO skills (user_id, skill_name, level) VALUES (%s, %s, %s)",
                    (user_id, skill_name, level)
                )
                return True, f"Added skill '{skill_name}' ({level})."

            elif table == "projects":
                title = data.get("title")
                desc = data.get("description", "")
                tech = data.get("tech_stack", "")
                url = data.get("project_url", "")
                execute_query(
                    "INSERT INTO projects (user_id, title, description, tech_stack, project_url) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, title, desc, tech, url)
                )
                return True, f"Added project '{title}'."

            elif table == "experience":
                company = data.get("company")
                role = data.get("role")
                duration = data.get("duration", "")
                desc = data.get("description", "")
                execute_query(
                    "INSERT INTO experience (user_id, company, role, duration, description) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, company, role, duration, desc)
                )
                return True, f"Added experience '{role}' at '{company}'."

            elif table == "achievements":
                title = data.get("title")
                desc = data.get("description", "")
                date_earned = data.get("date_earned", "")
                execute_query(
                    "INSERT INTO achievements (user_id, title, description, date_earned) VALUES (%s, %s, %s, %s)",
                    (user_id, title, desc, date_earned)
                )
                return True, f"Added achievement '{title}'."
            else:
                 return False, f"Cannot add to table '{table}'."
            
        except Exception as e:
            return False, f"Database error adding {table}: {str(e)}"
    
    else:
        return False, "Unsupported action."
