import psycopg2
import psycopg2.extras
from config import DB_URL

def get_connection():
    conn = psycopg2.connect(DB_URL)
    return conn

def execute_query(query, params=None, fetch=None):
    conn = get_connection()
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
