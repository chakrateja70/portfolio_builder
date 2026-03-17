"""
db.py - Database connection and helper functions for NeonDB (PostgreSQL)

This file handles all database operations.
We use psycopg2 to connect to PostgreSQL.
"""

import psycopg2
import psycopg2.extras
from config import DB_URL


def get_connection():
    """
    Create and return a new database connection.
    We open a new connection for each request (simple approach for beginners).
    """
    conn = psycopg2.connect(DB_URL)
    return conn


def execute_query(query, params=None, fetch=None):
    """
    Helper function to run any SQL query.

    Parameters:
        query  - The SQL string to run
        params - Tuple of values to safely insert into the query
        fetch  - "one" to get one row, "all" to get all rows, None for no result

    Returns:
        A single row dict, list of row dicts, or None
    """
    conn = get_connection()
    # RealDictCursor makes rows come back as dictionaries (easier to work with)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        cursor.execute(query, params)
        conn.commit()

        if fetch == "one":
            result = cursor.fetchone()
            return dict(result) if result else None
        elif fetch == "all":
            results = cursor.fetchall()
            return [dict(row) for row in results]
        else:
            return None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()
