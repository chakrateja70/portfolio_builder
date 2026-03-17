"""
profile.py - Profile CRUD (Create, Read, Update, Delete) operations

This module handles all profile-related database operations:
  - Basic details (name, phone, bio, location)
  - Projects (add, list, delete)
  - Experience (add, list, delete)
  - Skills (add, list, delete)
  - Achievements (add, list, delete)
  - Links (save or update GitHub, LinkedIn, portfolio, other)
"""

from db import execute_query


# ==================== BASIC DETAILS ====================

def get_basic_details(user_id):
    """Get basic profile details for a user."""
    return execute_query(
        "SELECT * FROM basic_details WHERE user_id = %s",
        (user_id,), fetch="one"
    )


def save_basic_details(user_id, data):
    """
    Insert or update basic details.
    'ON CONFLICT' means if a row already exists for this user, update it.
    """
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    bio = data.get("bio", "").strip()
    location = data.get("location", "").strip()

    execute_query(
        """
        INSERT INTO basic_details (user_id, full_name, phone, bio, location, updated_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            bio = EXCLUDED.bio,
            location = EXCLUDED.location,
            updated_at = NOW()
        """,
        (user_id, full_name, phone, bio, location)
    )
    return True, "Basic details saved."


# ==================== PROJECTS ====================

def get_projects(user_id):
    """Get all projects for a user, newest first."""
    return execute_query(
        "SELECT * FROM projects WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,), fetch="all"
    ) or []


def add_project(user_id, data):
    """Add a new project entry."""
    title = data.get("title", "").strip()
    if not title:
        return False, "Project title is required."

    description = data.get("description", "").strip()
    tech_stack = data.get("tech_stack", "").strip()
    project_url = data.get("project_url", "").strip()

    execute_query(
        """
        INSERT INTO projects (user_id, title, description, tech_stack, project_url)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, title, description, tech_stack, project_url)
    )
    return True, "Project added."


def delete_project(user_id, project_id):
    """Delete a project. We check user_id to make sure users can only delete their own."""
    execute_query(
        "DELETE FROM projects WHERE id = %s AND user_id = %s",
        (project_id, user_id)
    )
    return True, "Project deleted."


# ==================== EXPERIENCE ====================

def get_experience(user_id):
    """Get all experience entries for a user."""
    return execute_query(
        "SELECT * FROM experience WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,), fetch="all"
    ) or []


def add_experience(user_id, data):
    """Add a new experience entry."""
    company = data.get("company", "").strip()
    role = data.get("role", "").strip()
    if not company or not role:
        return False, "Company and role are required."

    duration = data.get("duration", "").strip()
    description = data.get("description", "").strip()

    execute_query(
        """
        INSERT INTO experience (user_id, company, role, duration, description)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, company, role, duration, description)
    )
    return True, "Experience added."


def delete_experience(user_id, exp_id):
    """Delete an experience entry."""
    execute_query(
        "DELETE FROM experience WHERE id = %s AND user_id = %s",
        (exp_id, user_id)
    )
    return True, "Experience deleted."


# ==================== SKILLS ====================

def get_skills(user_id):
    """Get all skills for a user."""
    return execute_query(
        "SELECT * FROM skills WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,), fetch="all"
    ) or []


def add_skill(user_id, data):
    """Add a new skill."""
    skill_name = data.get("skill_name", "").strip()
    if not skill_name:
        return False, "Skill name is required."

    level = data.get("level", "Intermediate").strip()
    # Only allow valid levels
    if level not in ["Beginner", "Intermediate", "Expert"]:
        level = "Intermediate"

    execute_query(
        "INSERT INTO skills (user_id, skill_name, level) VALUES (%s, %s, %s)",
        (user_id, skill_name, level)
    )
    return True, "Skill added."


def delete_skill(user_id, skill_id):
    """Delete a skill."""
    execute_query(
        "DELETE FROM skills WHERE id = %s AND user_id = %s",
        (skill_id, user_id)
    )
    return True, "Skill deleted."


# ==================== ACHIEVEMENTS ====================

def get_achievements(user_id):
    """Get all achievements for a user."""
    return execute_query(
        "SELECT * FROM achievements WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,), fetch="all"
    ) or []


def add_achievement(user_id, data):
    """Add a new achievement."""
    title = data.get("title", "").strip()
    if not title:
        return False, "Achievement title is required."

    description = data.get("description", "").strip()
    date_earned = data.get("date_earned", "").strip()

    execute_query(
        """
        INSERT INTO achievements (user_id, title, description, date_earned)
        VALUES (%s, %s, %s, %s)
        """,
        (user_id, title, description, date_earned)
    )
    return True, "Achievement added."


def delete_achievement(user_id, ach_id):
    """Delete an achievement."""
    execute_query(
        "DELETE FROM achievements WHERE id = %s AND user_id = %s",
        (ach_id, user_id)
    )
    return True, "Achievement deleted."


# ==================== LINKS ====================

def get_links(user_id):
    """Get social/portfolio links for a user."""
    return execute_query(
        "SELECT * FROM links WHERE user_id = %s",
        (user_id,), fetch="one"
    )


def save_links(user_id, data):
    """Insert or update links for a user."""
    github_url = data.get("github_url", "").strip()
    linkedin_url = data.get("linkedin_url", "").strip()
    portfolio_url = data.get("portfolio_url", "").strip()
    other_url = data.get("other_url", "").strip()

    execute_query(
        """
        INSERT INTO links (user_id, github_url, linkedin_url, portfolio_url, other_url, updated_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            github_url = EXCLUDED.github_url,
            linkedin_url = EXCLUDED.linkedin_url,
            portfolio_url = EXCLUDED.portfolio_url,
            other_url = EXCLUDED.other_url,
            updated_at = NOW()
        """,
        (user_id, github_url, linkedin_url, portfolio_url, other_url)
    )
    return True, "Links saved."
