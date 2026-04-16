import sys
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect("dbname=phygitron user=cluxssy host=localhost port=5432")

conn = get_db_connection()
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'")
schemas = cur.fetchall()

for sc in schemas:
    schema = sc['schema_name']
    print(f"=== SCHEMA {schema} ===")
    cur.execute(f'SET search_path TO "{schema}"')
    cur.execute("SELECT id, username, employee_code, role FROM users")
    users = cur.fetchall()
    print("USERS:", users)
    cur.execute("SELECT employee_code, name FROM employees")
    emps = cur.fetchall()
    print("EMPLOYEES:", emps)
