import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data') # Still used for static files/uploads

# Database configuration from .env
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "hrms_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def get_db_connection():
    """Returns a connection to the PostgreSQL database."""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    # This doesn't set a row factory globally like sqlite, 
    # instead we use cursor_factory=RealDictCursor when creating cursors.
    return conn

def create_tables():
    """Initializes the database schema for PostgreSQL."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print(f"Creating tables in PostgreSQL database: {DB_NAME}...")

    # 1) Employees Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_code TEXT UNIQUE,
            name TEXT NOT NULL,
            dob TEXT,
            contact_number TEXT,
            emergency_contact TEXT,
            email_id TEXT,
            doj TEXT, 
            team TEXT,
            designation TEXT,
            employment_type TEXT,
            reporting_manager TEXT,
            location TEXT,
            current_address TEXT,
            permanent_address TEXT,
            education_details TEXT,
            employment_status TEXT DEFAULT 'Active',
            photo_path TEXT,
            cv_path TEXT,
            id_proofs TEXT,
            pf_included TEXT,
            mediclaim_included TEXT,
            notes TEXT,
            exit_date TEXT,
            exit_reason TEXT,
            clearance_status TEXT
        )
    ''')

    # 1.1) Tenants Table (Multi-tenancy and Billing)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS tenants (
            id SERIAL PRIMARY KEY,
            tenant_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            modules_enabled TEXT DEFAULT 'deploy',
            subscription_status TEXT DEFAULT 'trial',
            stripe_customer_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 1.5) Role Permissions Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role TEXT NOT NULL,
            permission TEXT NOT NULL,
            is_allowed INTEGER DEFAULT 0,
            UNIQUE(role, permission)
        )
    ''')

    # 1.6) User Permissions Table (Overrides)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_permissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            permission TEXT NOT NULL,
            is_allowed INTEGER DEFAULT 0,
            UNIQUE(user_id, permission)
        )
    ''')

    # 2) Users Table 
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('HR', 'Admin', 'Management', 'Employee')) NOT NULL,
            employee_code TEXT,
            is_active INTEGER DEFAULT 1,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            password_must_change INTEGER DEFAULT 0,
            password_changed_at TIMESTAMP,
            password_changed_by TEXT
        )
    ''')
    
    # 2a) Password Reset Tokens Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            used_at TIMESTAMP,
            created_by TEXT,
            reset_type TEXT DEFAULT 'self'
        )
    ''')
    
    # 2b) Onboarding Invites Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS onboarding_invites (
            id SERIAL PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Employee',
            department TEXT,
            designation TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    ''')

    # 3) Skill Matrix Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS skill_matrix (
            id SERIAL PRIMARY KEY,
            employee_code TEXT,
            candidate_name TEXT,
            primary_skillset TEXT,
            secondary_skillset TEXT,
            experience_years REAL,
            last_contact_date TEXT,
            cv_upload TEXT
        )
    ''')

    # 4) Assets Checklist Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id SERIAL PRIMARY KEY,
            employee_code TEXT UNIQUE REFERENCES employees(employee_code),
            ob_laptop INTEGER DEFAULT 0,
            ob_laptop_bag INTEGER DEFAULT 0,
            ob_headphones INTEGER DEFAULT 0,
            ob_mouse INTEGER DEFAULT 0,
            ob_extra_hardware INTEGER DEFAULT 0,
            ob_client_assets INTEGER DEFAULT 0,
            ob_id_card INTEGER DEFAULT 0,
            ob_email_access INTEGER DEFAULT 0,
            ob_groups INTEGER DEFAULT 0,
            ob_mediclaim INTEGER DEFAULT 0,
            ob_pf INTEGER DEFAULT 0,
            ob_remarks TEXT,
            cl_laptop INTEGER DEFAULT 0,
            cl_laptop_bag INTEGER DEFAULT 0,
            cl_headphones INTEGER DEFAULT 0,
            cl_mouse INTEGER DEFAULT 0,
            cl_extra_hardware INTEGER DEFAULT 0,
            cl_client_assets INTEGER DEFAULT 0,
            cl_id_card INTEGER DEFAULT 0,
            cl_email_access INTEGER DEFAULT 0,
            cl_groups INTEGER DEFAULT 0,
            cl_relieving_letter INTEGER DEFAULT 0,
            cl_remarks TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 5) HR Activity Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS hr_activity (
            id SERIAL PRIMARY KEY,
            employee_code TEXT,
            employee_name TEXT,
            training_assigned TEXT,
            training_date TEXT,
            training_duration TEXT,
            training_status TEXT,
            status TEXT,
            last_follow_up TEXT,
            program_id INTEGER
        )
    ''')
    
    # 5b) Training Library 
    cur.execute('''
        CREATE TABLE IF NOT EXISTS training_library (
            id SERIAL PRIMARY KEY,
            program_name TEXT NOT NULL,
            description TEXT,
            default_duration TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 6) Performance Table (Legacy)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS performance (
            id SERIAL PRIMARY KEY,
            employee_code TEXT,
            employee_name TEXT,
            monthly_check_in_notes TEXT,
            manager_feedback TEXT,
            improvement_areas TEXT,
            recognition_rewards TEXT
        )
    ''')

    # 7) KRA Library Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS kra_library (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            goal_name TEXT,
            description TEXT,
            weightage REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 8) KRA Assignments Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS kra_assignments (
            id SERIAL PRIMARY KEY,
            kra_id INTEGER NOT NULL REFERENCES kra_library(id),
            employee_code TEXT NOT NULL REFERENCES employees(employee_code),
            period TEXT,
            status TEXT DEFAULT 'Assigned',
            self_rating REAL,
            manager_rating REAL,
            final_score REAL,
            self_comment TEXT,
            manager_comment TEXT,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 9) Employee Groups Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS employee_groups (
            id SERIAL PRIMARY KEY,
            group_name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 10) Employee Group Members Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS employee_group_members (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES employee_groups(id),
            employee_code TEXT NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 11) Training Programs Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS training_programs (
            id SERIAL PRIMARY KEY,
            program_name TEXT NOT NULL,
            description TEXT,
            default_duration TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 12) Training Assignments Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS training_assignments (
            id SERIAL PRIMARY KEY,
            employee_code TEXT NOT NULL,
            program_id INTEGER NOT NULL REFERENCES training_programs(id),
            training_date TEXT,
            duration TEXT,
            status TEXT DEFAULT 'Pending',
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 13) Audit Logs Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            username TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 14) Notifications Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            employee_code TEXT,
            title TEXT,
            message TEXT,
            type TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 15) Employee Documents Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS employee_documents (
            id SERIAL PRIMARY KEY,
            employee_code TEXT,
            document_type TEXT,
            document_name TEXT,
            file_path TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            uploaded_by TEXT
        )
    ''')

    # 16) Attendance Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            employee_code TEXT NOT NULL REFERENCES employees(employee_code),
            date TEXT NOT NULL,
            clock_in TEXT,
            clock_out TEXT,
            work_log TEXT,
            status TEXT DEFAULT 'Present',
            ip_address TEXT,
            UNIQUE(employee_code, date)
        )
    ''')

    # 17) Leaves Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS leaves (
            id SERIAL PRIMARY KEY,
            employee_code TEXT NOT NULL REFERENCES employees(employee_code),
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            leave_type TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'Pending',
            rejection_reason TEXT,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 18) Leave Balances Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS leave_balances (
            id SERIAL PRIMARY KEY,
            employee_code TEXT NOT NULL UNIQUE REFERENCES employees(employee_code),
            year INTEGER NOT NULL,
            sick_total INTEGER DEFAULT 10,
            sick_used INTEGER DEFAULT 0,
            casual_total INTEGER DEFAULT 12,
            casual_used INTEGER DEFAULT 0,
            privilege_total INTEGER DEFAULT 15,
            privilege_used INTEGER DEFAULT 0
        )
    ''')

    # 19) Sessions Table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_token TEXT PRIMARY KEY,
            user_id INTEGER,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 20) Quarterly Assessments
    cur.execute('''
        CREATE TABLE IF NOT EXISTS quarterly_assessments (
            id SERIAL PRIMARY KEY,
            employee_code TEXT,
            year INTEGER,
            quarter TEXT, -- Q1, Q2, Q3, Q4
            status TEXT DEFAULT 'Draft',
            total_score INTEGER DEFAULT 0,
            percentage REAL DEFAULT 0.0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_code, year, quarter)
        )
    ''') 

    cur.execute('''
        CREATE TABLE IF NOT EXISTS assessment_entries (
            id SERIAL PRIMARY KEY,
            assessment_id INTEGER REFERENCES quarterly_assessments(id),
            category TEXT,
            subcategory TEXT,
            self_score INTEGER DEFAULT 0,
            manager_score INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            manager_comment TEXT,
            employee_comment TEXT
        )
    ''')

    conn.commit()
    cur.close()
    conn.close()
    print("PostgreSQL tables created successfully!")

if __name__ == "__main__":
    create_tables()

