import psycopg2
from psycopg2.extras import RealDictCursor, register_default_jsonb
import json
import os
from dotenv import load_dotenv

# Register JSONB adapter globally
register_default_jsonb()

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
    return conn

def create_tables(schema_name='public'):
    """Initializes the database schema for PostgreSQL."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # Set Search Path for Isolation
        cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
        cur.execute(f'SET search_path TO "{schema_name}"')

        # --- Master Registry (Only in Public) ---
        if schema_name == 'public':
            cur.execute('''
                CREATE TABLE IF NOT EXISTS tenants (
                    id TEXT PRIMARY KEY, -- tenant_acme_corp
                    company_name TEXT NOT NULL,
                    admin_email TEXT NOT NULL,
                    subdomain TEXT UNIQUE, -- acmecorp
                    plan TEXT DEFAULT 'starter',
                    modules_enabled TEXT[] DEFAULT ARRAY['source','forge','verify','deploy'],
                    subscription_status TEXT DEFAULT 'trial',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            cur.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    session_token TEXT PRIMARY KEY,
                    user_id INTEGER,
                    tenant_id TEXT, -- The schema this session belongs to
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # --- Lead Generation / Demo Requests ---
            cur.execute('''
                CREATE TABLE IF NOT EXISTS demo_requests (
                    id SERIAL PRIMARY KEY,
                    company_name TEXT NOT NULL,
                    contact_name TEXT NOT NULL,
                    work_email TEXT NOT NULL UNIQUE,
                    job_title TEXT,
                    company_size TEXT,
                    modules_requested TEXT[],
                    current_tools TEXT,
                    discovery_source TEXT,
                    message TEXT,
                    status TEXT DEFAULT 'New', -- New, Contacted, Qualified, Demo Scheduled, Provisioned
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')


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
                education_details JSONB,
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
        # 1.1) Skill Matrix Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS skill_matrix (
                id SERIAL PRIMARY KEY,
                employee_code TEXT NOT NULL REFERENCES employees(employee_code) ON UPDATE CASCADE ON DELETE CASCADE,
                candidate_name TEXT,
                primary_skillset TEXT,
                secondary_skillset TEXT,
                experience_years TEXT,
                cv_upload TEXT,
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
                role TEXT CHECK(role IN (
                    'super_admin', 'org_admin', 'manager', 'employee', 'candidate'
                )) NOT NULL,
                roles TEXT[],
                employee_code TEXT REFERENCES employees(employee_code) ON UPDATE CASCADE,
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
                tenant_id TEXT NOT NULL DEFAULT 'public',
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

        # 3) Talent Vault: Candidates Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                location TEXT,
                total_experience_years REAL DEFAULT 0,
                current_designation TEXT,
                current_company TEXT,
                expected_salary TEXT,
                notice_period TEXT,
                skills TEXT[], -- Array of strings for fast filtering
                resume_path TEXT,
                resume_url TEXT,
                linkedin_url TEXT,
                portfolio_url TEXT,
                source TEXT DEFAULT 'Manual',
                status TEXT DEFAULT 'New',
                availability TEXT,
                ai_summary TEXT,
                certifications JSONB DEFAULT '[]'::jsonb,
                languages JSONB DEFAULT '[]'::jsonb,
                achievements JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.0.1) Skill Taxonomy
        cur.execute('''
            CREATE TABLE IF NOT EXISTS skill_taxonomy (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                normalized_name TEXT UNIQUE NOT NULL,
                category TEXT,
                aliases JSONB DEFAULT '[]'::jsonb,
                parent_id INTEGER REFERENCES skill_taxonomy(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.0.2) Skill Graph Edges
        cur.execute('''
            CREATE TABLE IF NOT EXISTS skill_graph_edges (
                id SERIAL PRIMARY KEY,
                from_skill_id INTEGER NOT NULL REFERENCES skill_taxonomy(id),
                to_skill_id INTEGER NOT NULL REFERENCES skill_taxonomy(id),
                relation TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.0.3) Job Roles
        cur.execute('''
            CREATE TABLE IF NOT EXISTS job_roles (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                required_skills JSONB DEFAULT '[]'::jsonb,
                min_experience INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.0.4) Candidate Skills (Structured)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidate_skills (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                skill_id INTEGER NOT NULL REFERENCES skill_taxonomy(id),
                level TEXT DEFAULT 'beginner',
                source TEXT DEFAULT 'resume',
                years_of_use INTEGER,
                evidence TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(candidate_id, skill_id)
            )
        ''')

        # 3.0.5) Candidate Invites
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidate_invites (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                job_role_id INTEGER NOT NULL REFERENCES job_roles(id),
                hr_user_id INTEGER REFERENCES users(id),
                temp_password_hash TEXT,
                email_sent_at TIMESTAMP,
                opened_at TIMESTAMP,
                logged_in_at TIMESTAMP,
                status TEXT DEFAULT 'sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.0.6) AI Scores
        cur.execute('''
            CREATE TABLE IF NOT EXISTS ai_scores (
                id SERIAL PRIMARY KEY,
                entity_type TEXT NOT NULL, -- candidate, employee
                entity_id INTEGER NOT NULL,
                job_role_id INTEGER REFERENCES job_roles(id),
                score_type TEXT NOT NULL,
                score DECIMAL(6, 2),
                reasoning TEXT,
                computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 21) Assessments (Verify Module)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS assessments (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT DEFAULT 'mcq',
                time_limit_minutes INTEGER,
                pass_score DECIMAL(5, 2) DEFAULT 70.0,
                shuffle_questions BOOLEAN DEFAULT FALSE,
                show_result_immediately BOOLEAN DEFAULT True,
                created_by INTEGER REFERENCES users(id),
                status TEXT DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 22) Assessment Questions
        cur.execute('''
            CREATE TABLE IF NOT EXISTS assessment_questions (
                id SERIAL PRIMARY KEY,
                assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                question_type TEXT NOT NULL,
                options JSONB,
                correct_answer TEXT,
                model_answer TEXT,
                starter_code TEXT,
                test_cases JSONB,
                programming_language TEXT,
                accepted_file_types TEXT,
                skill_id INTEGER REFERENCES skill_taxonomy(id),
                marks DECIMAL(6, 2) DEFAULT 1.0,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 23) Assessment Assignments
        cur.execute('''
            CREATE TABLE IF NOT EXISTS assessment_assignments (
                id SERIAL PRIMARY KEY,
                assessment_id INTEGER NOT NULL REFERENCES assessments(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                assigned_by INTEGER REFERENCES users(id),
                deadline TIMESTAMP,
                status TEXT DEFAULT 'pending',
                started_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 24) Assessment Results
        cur.execute('''
            CREATE TABLE IF NOT EXISTS assessment_results (
                id SERIAL PRIMARY KEY,
                assessment_id INTEGER NOT NULL REFERENCES assessments(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                answers JSONB,
                scores_per_question JSONB,
                score DECIMAL(5, 2),
                pass_status BOOLEAN,
                feedback TEXT,
                weak_skill_ids JSONB,
                time_taken_seconds INTEGER,
                submitted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 25) Proctoring Flags
        cur.execute('''
            CREATE TABLE IF NOT EXISTS proctoring_flags (
                id SERIAL PRIMARY KEY,
                assessment_result_id INTEGER NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
                flag_type TEXT NOT NULL,
                details TEXT,
                flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.1) Candidate Experience (For AI Analysis)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidate_experience (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
                company TEXT,
                designation TEXT,
                start_date TEXT,
                end_date TEXT,
                is_current BOOLEAN DEFAULT FALSE,
                description TEXT
            )
        ''')

        # 3.2) Candidate Education
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidate_education (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
                institution TEXT,
                degree TEXT,
                field_of_study TEXT,
                start_date TEXT,
                end_date TEXT
            )
        ''')

        # 3.3) Candidate Notes
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidate_notes (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
                author_name TEXT,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 3.4) Candidate Activity Log
        cur.execute('''
            CREATE TABLE IF NOT EXISTS candidate_activity_log (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
                actor_name TEXT,
                action TEXT NOT NULL,
                detail TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 4) Assets Checklist Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS assets (
                id SERIAL PRIMARY KEY,
                employee_code TEXT UNIQUE REFERENCES employees(employee_code) ON UPDATE CASCADE,
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
                employee_code TEXT NOT NULL REFERENCES employees(employee_code),
                program_id INTEGER NOT NULL REFERENCES training_programs(id),
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'Assigned',
                completed_at TIMESTAMP
            )
        ''')

        # 13) Performance Assessments Table (Universal)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS performance_assessments (
                id SERIAL PRIMARY KEY,
                employee_code VARCHAR(255) NOT NULL,
                year INTEGER NOT NULL,
                period_type VARCHAR(50) NOT NULL,
                period_value VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Draft',
                entries JSONB DEFAULT '[]'::jsonb,
                total_score DOUBLE PRECISION DEFAULT 0,
                percentage DOUBLE PRECISION DEFAULT 0,
                tenant_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_code, year, period_type, period_value)
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
                employee_code TEXT NOT NULL REFERENCES employees(employee_code) ON UPDATE CASCADE,
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
                employee_code TEXT NOT NULL REFERENCES employees(employee_code) ON UPDATE CASCADE,
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
                employee_code TEXT NOT NULL UNIQUE REFERENCES employees(employee_code) ON UPDATE CASCADE,
                year INTEGER NOT NULL,
                sick_total INTEGER DEFAULT 10,
                sick_used INTEGER DEFAULT 0,
                casual_total INTEGER DEFAULT 12,
                casual_used INTEGER DEFAULT 0,
                privilege_total INTEGER DEFAULT 15,
                privilege_used INTEGER DEFAULT 0
            )
        ''')


        # --- Forge (Learning Hub) Tables ---
        # 19.1) Courses
        cur.execute('''
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                thumbnail_url TEXT,
                author_id INTEGER REFERENCES users(id),
                status TEXT DEFAULT 'draft', -- draft, published, archived
                difficulty_level TEXT,
                estimated_hours REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 19.2) Course Sections (Modules/Chapters)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS course_sections (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 19.3) Lessons (Content within sections)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS lessons (
                id SERIAL PRIMARY KEY,
                section_id INTEGER NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                content_type TEXT NOT NULL, -- video, article, quiz
                content_url TEXT, -- S3 link or embedded link
                markdown_content TEXT,
                duration_minutes INTEGER DEFAULT 0,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 19.4) Course Enrollments
        cur.execute('''
            CREATE TABLE IF NOT EXISTS course_enrollments (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                enrolled_by INTEGER REFERENCES users(id), -- If assigned by manager
                status TEXT DEFAULT 'enrolled', -- enrolled, in_progress, completed
                progress_percentage REAL DEFAULT 0.0,
                last_accessed_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(course_id, user_id)
            )
        ''')

        # 19.5) Certificates
        cur.execute('''
            CREATE TABLE IF NOT EXISTS certificates (
                id SERIAL PRIMARY KEY,
                enrollment_id INTEGER NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id),
                course_id INTEGER NOT NULL REFERENCES courses(id),
                issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                certificate_url TEXT,
                validation_code TEXT UNIQUE NOT NULL
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
    except Exception as e:
        conn.rollback()
        print(f"Failed to create tables in {schema_name}: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_tables()
