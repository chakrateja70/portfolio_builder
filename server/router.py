"""
router.py - URL routing for the HTTP server

This file maps URL paths + HTTP methods to handler functions.
Think of it like a lookup table:
  "POST /api/register" → calls handle_register()
  "GET /api/profile"   → calls handle_get_profile()
  etc.
"""

import json
import os
import datetime
from auth import register_user, login_user, get_user_from_token, delete_session
from profile import (
    get_basic_details, save_basic_details,
    get_projects, add_project, delete_project,
    get_experience, add_experience, delete_experience,
    get_skills, add_skill, delete_skill,
    get_achievements, add_achievement, delete_achievement,
    get_links, save_links
)
from ai_handler import ask_question, run_personal_assistant


# Path to the frontend folder (one level up from server/)
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')


def parse_body(handler):
    """
    Read and parse the JSON body from an incoming HTTP request.
    Returns a dict, or empty dict if the body is empty/invalid.
    """
    content_length = int(handler.headers.get("Content-Length", 0))
    if content_length == 0:
        return {}
    raw_body = handler.rfile.read(content_length)
    try:
        return json.loads(raw_body.decode("utf-8"))
    except:
        return {}


def get_session_token(handler):
    """
    Extract the session token from the Cookie header.
    The frontend stores the token as: Cookie: token=<value>
    """
    cookie_header = handler.headers.get("Cookie", "")
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith("token="):
            return part[len("token="):]
    return None


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that converts datetime objects to ISO string format."""
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        return super().default(obj)


def send_json(handler, status_code, data):
    """
    Send a JSON response back to the client.
    Uses DateTimeEncoder to safely handle datetime values from the database.
    """
    body = json.dumps(data, cls=DateTimeEncoder).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(body)



def serve_file(handler, file_path):
    """
    Serve a static file (HTML, CSS, JS) from the frontend directory.
    """
    # Determine content type based on file extension
    if file_path.endswith(".html"):
        content_type = "text/html"
    elif file_path.endswith(".css"):
        content_type = "text/css"
    elif file_path.endswith(".js"):
        content_type = "application/javascript"
    else:
        content_type = "text/plain"

    if not os.path.exists(file_path):
        handler.send_response(404)
        handler.end_headers()
        handler.wfile.write(b"File not found")
        return

    with open(file_path, "rb") as f:
        content = f.read()

    handler.send_response(200)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Length", str(len(content)))
    handler.end_headers()
    handler.wfile.write(content)


def route_request(handler, method, path):
    """
    Main routing function. Called for every incoming request.
    Matches the method + path to the right handler.
    """

    # ─── Serve frontend static files ───────────────────────────────────────
    if method == "GET":
        # Root path → redirect to login
        if path == "/" or path == "":
            file_path = os.path.join(FRONTEND_DIR, "login.html")
            serve_file(handler, file_path)
            return

        # Any .html, .css, .js file request
        if path.endswith((".html", ".css", ".js")):
            # Convert URL path to local file path
            # e.g. /css/style.css → frontend/css/style.css
            rel_path = path.lstrip("/")
            file_path = os.path.join(FRONTEND_DIR, rel_path)
            serve_file(handler, file_path)
            return

    # ─── CORS preflight ────────────────────────────────────────────────────
    if method == "OPTIONS":
        handler.send_response(200)
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        handler.send_header("Access-Control-Allow-Headers", "Content-Type")
        handler.end_headers()
        return

    # ─── Auth routes ───────────────────────────────────────────────────────
    if method == "POST" and path == "/api/register":
        data = parse_body(handler)
        success, message = register_user(data)
        status = 201 if success else 400
        send_json(handler, status, {"success": success, "message": message})
        return

    if method == "POST" and path == "/api/login":
        data = parse_body(handler)
        success, message, token = login_user(data)
        if success:
            body = json.dumps({"success": True, "message": message}).encode("utf-8")
            handler.send_response(200)
            handler.send_header("Content-Type", "application/json")
            handler.send_header("Content-Length", str(len(body)))
            # Set session cookie (valid for 7 days)
            handler.send_header("Set-Cookie", f"token={token}; Path=/; Max-Age=604800; HttpOnly")
            handler.send_header("Access-Control-Allow-Origin", "*")
            handler.end_headers()
            handler.wfile.write(body)
        else:
            send_json(handler, 401, {"success": False, "message": message})
        return

    if method == "POST" and path == "/api/logout":
        token = get_session_token(handler)
        if token:
            delete_session(token)
        send_json(handler, 200, {"success": True, "message": "Logged out."})
        return

    # ─── All routes below require login ────────────────────────────────────
    token = get_session_token(handler)
    user = get_user_from_token(token)

    if not user:
        send_json(handler, 401, {"success": False, "message": "Please log in first."})
        return

    user_id = user["id"]

    # ─── Basic Details ─────────────────────────────────────────────────────
    if path == "/api/profile/basic":
        if method == "GET":
            data = get_basic_details(user_id)
            send_json(handler, 200, {"success": True, "data": data, "user": user})
        elif method == "POST":
            data = parse_body(handler)
            success, message = save_basic_details(user_id, data)
            send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── Projects ──────────────────────────────────────────────────────────
    if path == "/api/profile/projects":
        if method == "GET":
            projects = get_projects(user_id)
            send_json(handler, 200, {"success": True, "data": projects})
        elif method == "POST":
            data = parse_body(handler)
            success, message = add_project(user_id, data)
            send_json(handler, 200, {"success": success, "message": message})
        return

    if method == "DELETE" and path.startswith("/api/profile/projects/"):
        project_id = path.split("/")[-1]
        success, message = delete_project(user_id, project_id)
        send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── Experience ────────────────────────────────────────────────────────
    if path == "/api/profile/experience":
        if method == "GET":
            experience = get_experience(user_id)
            send_json(handler, 200, {"success": True, "data": experience})
        elif method == "POST":
            data = parse_body(handler)
            success, message = add_experience(user_id, data)
            send_json(handler, 200, {"success": success, "message": message})
        return

    if method == "DELETE" and path.startswith("/api/profile/experience/"):
        exp_id = path.split("/")[-1]
        success, message = delete_experience(user_id, exp_id)
        send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── Skills ────────────────────────────────────────────────────────────
    if path == "/api/profile/skills":
        if method == "GET":
            skills = get_skills(user_id)
            send_json(handler, 200, {"success": True, "data": skills})
        elif method == "POST":
            data = parse_body(handler)
            success, message = add_skill(user_id, data)
            send_json(handler, 200, {"success": success, "message": message})
        return

    if method == "DELETE" and path.startswith("/api/profile/skills/"):
        skill_id = path.split("/")[-1]
        success, message = delete_skill(user_id, skill_id)
        send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── Achievements ──────────────────────────────────────────────────────
    if path == "/api/profile/achievements":
        if method == "GET":
            achievements = get_achievements(user_id)
            send_json(handler, 200, {"success": True, "data": achievements})
        elif method == "POST":
            data = parse_body(handler)
            success, message = add_achievement(user_id, data)
            send_json(handler, 200, {"success": success, "message": message})
        return

    if method == "DELETE" and path.startswith("/api/profile/achievements/"):
        ach_id = path.split("/")[-1]
        success, message = delete_achievement(user_id, ach_id)
        send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── Links ─────────────────────────────────────────────────────────────
    if path == "/api/profile/links":
        if method == "GET":
            data = get_links(user_id)
            send_json(handler, 200, {"success": True, "data": data})
        elif method == "POST":
            data = parse_body(handler)
            success, message = save_links(user_id, data)
            send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── AI: Q&A Mode ──────────────────────────────────────────────────────
    if method == "POST" and path == "/api/ai/chat":
        data = parse_body(handler)
        question = data.get("question", "")
        answer = ask_question(question)
        send_json(handler, 200, {"success": True, "answer": answer})
        return

    # ─── AI: Personal Assistant Mode ───────────────────────────────────────
    if method == "POST" and path == "/api/ai/assistant":
        data = parse_body(handler)
        prompt = data.get("prompt", "")
        success, message = run_personal_assistant(user_id, prompt)
        send_json(handler, 200, {"success": success, "message": message})
        return

    # ─── 404 Not Found ─────────────────────────────────────────────────────
    send_json(handler, 404, {"success": False, "message": "Route not found."})
