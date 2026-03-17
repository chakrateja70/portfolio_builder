"""
config.py - Load environment variables from .env file
"""

import os
from dotenv import load_dotenv

# Load variables from .env file into environment
load_dotenv()

# Database connection string for NeonDB (PostgreSQL)
DB_URL = os.getenv("DB_URL")

# Groq API key for AI features
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Secret key used for generating session tokens
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")
