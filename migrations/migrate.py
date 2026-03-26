"""
migrate.py - Database migration script

Run this ONCE to create all the tables in your NeonDB database.
Usage: python migrations/migrate.py

Tables created:
  - users           : stores login credentials
  - basic_details   : stores personal info (name, bio, etc.)
  - projects        : stores project entries
  - experience      : stores work/internship experience
  - skills          : stores skills with level
  - achievements    : stores awards or certificates
  - links           : stores social/portfolio links
"""

import sys
import os

# Allow importing from the server folder
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

from db import get_connection

# All table creation SQL statements
CREATE_TABLES_SQL = """

-- Table 1: users
-- Stores email and hashed password for login
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    TEXT NOT NULL,              -- bcrypt hashed
    username    VARCHAR(100) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 2: sessions
-- Stores login session tokens so users stay logged in
CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 3: basic_details
-- One row per user: name, phone, bio, location
CREATE TABLE IF NOT EXISTS basic_details (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name   VARCHAR(200),
    phone       VARCHAR(20),
    bio         TEXT,
    location    VARCHAR(200),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Table 4: projects
-- Multiple projects per user
CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    tech_stack  VARCHAR(300),       -- e.g. "Python, React, PostgreSQL"
    project_url VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 5: experience
-- Internships, jobs, freelance work
CREATE TABLE IF NOT EXISTS experience (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company     VARCHAR(200) NOT NULL,
    role        VARCHAR(200) NOT NULL,
    duration    VARCHAR(100),       -- e.g. "Jan 2024 - Mar 2024"
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 6: skills
-- Skills with an optional level
CREATE TABLE IF NOT EXISTS skills (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_name  VARCHAR(100) NOT NULL,
    level       VARCHAR(50) DEFAULT 'Intermediate',   -- Beginner/Intermediate/Expert
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 7: achievements
-- Certifications, awards, hackathon wins, etc.
CREATE TABLE IF NOT EXISTS achievements (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    date_earned VARCHAR(100),       -- e.g. "March 2024"
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 8: links
-- One row per user: social/portfolio links
CREATE TABLE IF NOT EXISTS links (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    github_url      VARCHAR(500),
    linkedin_url    VARCHAR(500),
    portfolio_url   VARCHAR(500),
    other_url       VARCHAR(500),
    updated_at      TIMESTAMP DEFAULT NOW()
);

"""


def run_migration():
    print("Connecting to NeonDB...")
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Creating tables...")
        cursor.execute(CREATE_TABLES_SQL)
        conn.commit()
        print("✅ All tables created successfully!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during migration: {e}")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
