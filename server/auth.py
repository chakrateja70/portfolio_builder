"""
auth.py - Registration and Login logic

This module handles:
  - Registering a new user (email, username, password)
  - Logging in an existing user
  - Generating a session token after login
  - Validating a session token on each request
"""

import hashlib
import secrets
import json
from db import execute_query


# ---------- Password Helpers ----------

def hash_password(password):
    """
    Hash the password using SHA-256.
    In real production apps you'd use bcrypt, but SHA-256 is simpler to understand.
    """
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password, hashed_password):
    """Check if a plain password matches the stored hash."""
    return hash_password(plain_password) == hashed_password


# ---------- Session Helpers ----------

def create_session(user_id):
    """
    Generate a random session token and store it in the sessions table.
    Returns the token string.
    """
    token = secrets.token_hex(32)   # 64-character random string
    execute_query(
        "INSERT INTO sessions (user_id, token) VALUES (%s, %s)",
        (user_id, token)
    )
    return token


def get_user_from_token(token):
    """
    Look up a session token and return the user row if valid.
    Returns None if the token doesn't exist.
    """
    if not token:
        return None
    row = execute_query(
        """
        SELECT users.id, users.email, users.username
        FROM sessions
        JOIN users ON sessions.user_id = users.id
        WHERE sessions.token = %s
        """,
        (token,),
        fetch="one"
    )
    return row


def delete_session(token):
    """Log out by deleting the session token from the database."""
    execute_query("DELETE FROM sessions WHERE token = %s", (token,))


# ---------- Register ----------

def register_user(data):
    """
    Register a new user.

    Expected data keys: email, username, password, confirm_password

    Returns:
        (success: bool, message: str)
    """
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    # --- Validation ---
    if not email or not username or not password:
        return False, "Email, username, and password are required."

    if "@" not in email or "." not in email:
        return False, "Please enter a valid email address."

    if len(password) < 6:
        return False, "Password must be at least 6 characters."

    if password != confirm_password:
        return False, "Passwords do not match."

    # Check if email already exists
    existing = execute_query(
        "SELECT id FROM users WHERE email = %s", (email,), fetch="one"
    )
    if existing:
        return False, "An account with this email already exists."

    # Check if username already exists
    existing_username = execute_query(
        "SELECT id FROM users WHERE username = %s", (username,), fetch="one"
    )
    if existing_username:
        return False, "This username is already taken."

    # --- Insert User ---
    hashed = hash_password(password)
    execute_query(
        "INSERT INTO users (email, username, password) VALUES (%s, %s, %s)",
        (email, username, hashed)
    )

    return True, "Registration successful! Please log in."


# ---------- Login ----------

def login_user(data):
    """
    Log in an existing user.

    Expected data keys: email, password

    Returns:
        (success: bool, message: str, token: str or None)
    """
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # --- Validation ---
    if not email or not password:
        return False, "Email and password are required.", None

    # Fetch user by email
    user = execute_query(
        "SELECT * FROM users WHERE email = %s", (email,), fetch="one"
    )

    if not user:
        return False, "No account found with this email.", None

    if not verify_password(password, user["password"]):
        return False, "Incorrect password.", None

    # Create session token
    token = create_session(user["id"])
    return True, "Login successful!", token
