import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "hrms_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def apply_migration(migration_path):
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    try:
        with conn.cursor() as cur:
            with open(migration_path, "r") as f:
                sql = f.read()
                print(f"Applying migration: {migration_path}...")
                cur.execute(sql)
            conn.commit()
            print("Migration applied successfully!⚡️")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "scripts/migrations/001_multi_role_support.sql"
    apply_migration(path)
