import sys
sys.path.append("/Users/cluxssy/Code/phygitron360")
from backend.core.database import get_db_connection

conn = get_db_connection()
cur = conn.cursor()
cur.execute("SET search_path TO tenant_acer, public")
cur.execute("""
    SELECT pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'employees' AND c.contype = 'c';
""")
print("constraints:", cur.fetchall())
