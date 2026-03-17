from fastapi import APIRouter, Response, Cookie, Depends
from typing import Optional

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

api_router = APIRouter()

def get_current_user(token: Optional[str] = Cookie(None)):
    """Auth dependency that validates the session token."""
    user = get_user_from_token(token)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=401,
            detail={"success": False, "message": "Please log in first."}
        )
    return user


# ─── Auth routes ───────────────────────────────────────────────────────

@api_router.post("/api/register")
def register(data: dict, response: Response):
    success, message = register_user(data)
    response.status_code = 201 if success else 400
    return {"success": success, "message": message}

@api_router.post("/api/login")
def login(data: dict, response: Response):
    success, message, token = login_user(data)
    if success:
        response.set_cookie(key="token", value=token, max_age=604800, httponly=True, path="/")
        return {"success": True, "message": message}
    else:
        response.status_code = 401
        return {"success": False, "message": message}

@api_router.post("/api/logout")
def logout(token: Optional[str] = Cookie(None)):
    if token:
        delete_session(token)
    return {"success": True, "message": "Logged out."}


# ─── Basic Details ─────────────────────────────────────────────────────

@api_router.get("/api/profile/basic")
def get_profile_basic(user: dict = Depends(get_current_user)):
    data = get_basic_details(user["id"])
    return {"success": True, "data": data, "user": user}

@api_router.post("/api/profile/basic")
def save_profile_basic(data: dict, user: dict = Depends(get_current_user)):
    success, message = save_basic_details(user["id"], data)
    return {"success": success, "message": message}


# ─── Projects ──────────────────────────────────────────────────────────

@api_router.get("/api/profile/projects")
def get_profile_projects(user: dict = Depends(get_current_user)):
    projects = get_projects(user["id"])
    return {"success": True, "data": projects}

@api_router.post("/api/profile/projects")
def add_profile_project(data: dict, user: dict = Depends(get_current_user)):
    success, message = add_project(user["id"], data)
    return {"success": success, "message": message}

@api_router.delete("/api/profile/projects/{project_id}")
def delete_profile_project(project_id: str, user: dict = Depends(get_current_user)):
    success, message = delete_project(user["id"], project_id)
    return {"success": success, "message": message}


# ─── Experience ────────────────────────────────────────────────────────

@api_router.get("/api/profile/experience")
def get_profile_experience(user: dict = Depends(get_current_user)):
    experience = get_experience(user["id"])
    return {"success": True, "data": experience}

@api_router.post("/api/profile/experience")
def add_profile_experience(data: dict, user: dict = Depends(get_current_user)):
    success, message = add_experience(user["id"], data)
    return {"success": success, "message": message}

@api_router.delete("/api/profile/experience/{exp_id}")
def delete_profile_experience(exp_id: str, user: dict = Depends(get_current_user)):
    success, message = delete_experience(user["id"], exp_id)
    return {"success": success, "message": message}


# ─── Skills ────────────────────────────────────────────────────────────

@api_router.get("/api/profile/skills")
def get_profile_skills(user: dict = Depends(get_current_user)):
    skills = get_skills(user["id"])
    return {"success": True, "data": skills}

@api_router.post("/api/profile/skills")
def add_profile_skill(data: dict, user: dict = Depends(get_current_user)):
    success, message = add_skill(user["id"], data)
    return {"success": success, "message": message}

@api_router.delete("/api/profile/skills/{skill_id}")
def delete_profile_skill(skill_id: str, user: dict = Depends(get_current_user)):
    success, message = delete_skill(user["id"], skill_id)
    return {"success": success, "message": message}


# ─── Achievements ──────────────────────────────────────────────────────

@api_router.get("/api/profile/achievements")
def get_profile_achievements(user: dict = Depends(get_current_user)):
    achievements = get_achievements(user["id"])
    return {"success": True, "data": achievements}

@api_router.post("/api/profile/achievements")
def add_profile_achievement(data: dict, user: dict = Depends(get_current_user)):
    success, message = add_achievement(user["id"], data)
    return {"success": success, "message": message}

@api_router.delete("/api/profile/achievements/{ach_id}")
def delete_profile_achievement(ach_id: str, user: dict = Depends(get_current_user)):
    success, message = delete_achievement(user["id"], ach_id)
    return {"success": success, "message": message}


# ─── Links ─────────────────────────────────────────────────────────────

@api_router.get("/api/profile/links")
def get_profile_links(user: dict = Depends(get_current_user)):
    data = get_links(user["id"])
    return {"success": True, "data": data}

@api_router.post("/api/profile/links")
def save_profile_links(data: dict, user: dict = Depends(get_current_user)):
    success, message = save_links(user["id"], data)
    return {"success": success, "message": message}


# ─── AI: Q&A Mode ──────────────────────────────────────────────────────

@api_router.post("/api/ai/chat")
def handle_ai_chat(data: dict, user: dict = Depends(get_current_user)):
    question = data.get("question", "")
    answer = ask_question(question)
    return {"success": True, "answer": answer}


# ─── AI: Personal Assistant Mode ───────────────────────────────────────

@api_router.post("/api/ai/assistant")
def handle_ai_assistant(data: dict, user: dict = Depends(get_current_user)):
    prompt = data.get("prompt", "")
    success, message = run_personal_assistant(user["id"], prompt)
    return {"success": success, "message": message}