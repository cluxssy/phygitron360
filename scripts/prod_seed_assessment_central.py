#!/usr/bin/env python3
"""
scripts/prod_seed_assessment_central.py

Populates Assessment Central (Verify Module) in production tenant 'dev':
1. Creates 8 comprehensive, industry-standard assessments with questions:
   - Full Stack React & Node.js Assessment (Mixed)
   - Python Backend & Systems Architecture (Mixed)
   - AWS Cloud Solutions Architect & DevOps (MCQ)
   - UI/UX Design Systems & Product Heuristics (Mixed)
   - Data Science & ML Practical Evaluation (Mixed)
   - Cybersecurity, IAM & DevSecOps Fundamentals (MCQ)
   - Technical Product Management & Roadmapping (Written)
   - QA Automation & Test Engineering (Coding)
2. Seeds assignments and submissions:
   - 2 completed & graded passing submissions (yielding real pass-rate data, e.g. 85-92%)
   - 6 pending review items (submitted / in-progress assignments & candidate queries awaiting evaluation)
3. Seeds Proctoring & Live Monitor data:
   - Live Monitor candidates: Active in-progress test sessions with strike counts & timestamps
   - Proctoring strikes and proctoring flags logged for proctoring evidence reports
   - Configures global tenant proctoring defaults in public.tenants.settings
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta, timezone
import psycopg2
from psycopg2.extras import RealDictCursor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from scripts.prod_seed_dev_employees import (
    parse_tfvars, parse_tfstate, get_public_ip, set_do_db_firewall,
    TFVARS_PATH, TFSTATE_PATH
)

ASSESSMENTS = [
    {
        "title": "Full Stack React & Node.js Assessment",
        "description": "Comprehensive evaluation covering React 18 concurrency, state architecture, Node.js event loops, and RESTful API optimization.",
        "type": "Mixed",
        "time_limit_minutes": 60,
        "pass_score": 70.0,
        "status": "active",
        "questions": [
            {
                "question_text": "What is the primary architectural purpose of React 18's useTransition hook?",
                "question_type": "mcq",
                "options": json.dumps([
                    "To mark state updates as non-urgent transitions so the UI remains responsive",
                    "To synchronously batch DOM updates across multiple components",
                    "To replace useEffect for fetching server-side data",
                    "To memoize expensive calculations like useMemo"
                ]),
                "correct_answer": "To mark state updates as non-urgent transitions so the UI remains responsive",
                "marks": 5.0
            },
            {
                "question_text": "How does Node.js handle non-blocking asynchronous I/O across the thread pool vs event loop?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Network I/O is handled by epoll/kqueue via libuv, while file system tasks use the libuv worker thread pool",
                    "All asynchronous tasks spawn a new OS thread",
                    "Node.js runs single-threaded with no underlying thread pool",
                    "The V8 engine handles all OS kernel I/O directly"
                ]),
                "correct_answer": "Network I/O is handled by epoll/kqueue via libuv, while file system tasks use the libuv worker thread pool",
                "marks": 5.0
            },
            {
                "question_text": "Implement a debounce function in TypeScript that delays invoking func until after wait milliseconds have elapsed.",
                "question_type": "coding",
                "starter_code": "function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {\n  // Implement debounce\n}",
                "test_cases": json.dumps([{"input": "fn, 200", "output": "debounced_function"}]),
                "programming_language": "typescript",
                "marks": 15.0
            },
            {
                "question_text": "Explain trade-offs between Client-Side Rendering (CSR), Server-Side Rendering (SSR), and Static Site Generation (SSG) in enterprise dashboards.",
                "question_type": "written",
                "model_answer": "CSR provides interactive SPA capabilities but suffers from larger initial bundle sizes. SSR delivers fast TTFB and SEO but increases server compute. SSG offers ultra-fast CDN delivery but requires rebuilds for dynamic content.",
                "marks": 10.0
            }
        ]
    },
    {
        "title": "Python Backend & Systems Architecture",
        "description": "Tests high-throughput async programming, PostgreSQL query optimization, connection pooling, and microservices patterns.",
        "type": "Mixed",
        "time_limit_minutes": 60,
        "pass_score": 75.0,
        "status": "active",
        "questions": [
            {
                "question_text": "Why should database connection pool size be tuned to cpu_count * 2 + effective_spindle_count rather than set arbitrarily high?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Excessive connections cause severe OS context-switching overhead and disk I/O lock contention",
                    "PostgreSQL crashes when pool size exceeds 10 connections",
                    "Connection pools use TCP keep-alive which blocks network interfaces",
                    "CPU caches are cleared whenever a pool is recycled"
                ]),
                "correct_answer": "Excessive connections cause severe OS context-switching overhead and disk I/O lock contention",
                "marks": 5.0
            },
            {
                "question_text": "In Python's asyncio, what is the key difference between asyncio.gather() and asyncio.wait()?",
                "question_type": "mcq",
                "options": json.dumps([
                    "gather() aggregates return values in order, while wait() returns sets of (done, pending) tasks with granular timeout control",
                    "wait() cancels uncompleted tasks immediately",
                    "gather() runs tasks synchronously one after another",
                    "There is no difference"
                ]),
                "correct_answer": "gather() aggregates return values in order, while wait() returns sets of (done, pending) tasks with granular timeout control",
                "marks": 5.0
            },
            {
                "question_text": "Write a rate limiter middleware algorithm in Python implementing Token Bucket with Redis.",
                "question_type": "coding",
                "starter_code": "class TokenBucketRateLimiter:\n    def __init__(self, capacity: int, refill_rate_per_sec: float):\n        pass\n    def allow_request(self, client_id: str) -> bool:\n        pass",
                "programming_language": "python",
                "marks": 15.0
            }
        ]
    },
    {
        "title": "AWS Cloud Solutions Architect & DevOps",
        "description": "Production infrastructure design, multi-AZ high availability, VPC peering, IAM least-privilege, and Terraform best practices.",
        "type": "MCQ",
        "time_limit_minutes": 45,
        "pass_score": 70.0,
        "status": "active",
        "questions": [
            {
                "question_text": "Which AWS architecture pattern provides the most cost-effective RPO < 5 minutes and RTO < 15 minutes disaster recovery?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Warm Standby with automated cross-region database read replica promotion",
                    "Backup & Restore from S3 Glacier Deep Archive",
                    "Multi-Site Active-Active across 4 AWS regions",
                    "Pilot Light with manual database snapshot restoration"
                ]),
                "correct_answer": "Warm Standby with automated cross-region database read replica promotion",
                "marks": 10.0
            },
            {
                "question_text": "How do you securely grant an Amazon ECS task access to an S3 bucket without embedding credentials?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Assign an IAM Role to the ECS Task Role definition",
                    "Add AWS_ACCESS_KEY_ID to ECS task environment variables",
                    "Use EC2 Instance Profile on the host machine only",
                    "Store credentials in a public S3 bucket"
                ]),
                "correct_answer": "Assign an IAM Role to the ECS Task Role definition",
                "marks": 10.0
            }
        ]
    },
    {
        "title": "UI/UX Design Systems & Product Heuristics",
        "description": "Design tokens, WCAG 2.1 AA accessibility standards, responsive layouts, and interactive micro-animations.",
        "type": "Mixed",
        "time_limit_minutes": 45,
        "pass_score": 75.0,
        "status": "active",
        "questions": [
            {
                "question_text": "According to WCAG 2.1 AA requirements, what is the minimum contrast ratio required for normal body text against its background?",
                "question_type": "mcq",
                "options": json.dumps(["4.5:1", "3:1", "7:1", "2:1"]),
                "correct_answer": "4.5:1",
                "marks": 5.0
            },
            {
                "question_text": "Describe how semantic design tokens create a scalable bridge between Figma and React component libraries.",
                "question_type": "written",
                "model_answer": "Semantic tokens abstract raw visual values (like hex colors or pixel sizes) into intent-based tokens (e.g., surface-primary, text-muted), allowing seamless multi-theme, dark mode, and multi-brand support across platforms.",
                "marks": 15.0
            }
        ]
    },
    {
        "title": "Data Science & ML Practical Evaluation",
        "description": "Feature engineering, cross-validation strategies, handling class imbalance, and LLM embedding retrieval pipelines.",
        "type": "Mixed",
        "time_limit_minutes": 60,
        "pass_score": 70.0,
        "status": "active",
        "questions": [
            {
                "question_text": "When training a model on severely imbalanced fraud detection data (99.5% legitimate, 0.5% fraud), which metric is best for threshold tuning?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Precision-Recall AUC (PR-AUC) and F-Beta score",
                    "Accuracy score",
                    "Mean Squared Error (MSE)",
                    "R-squared"
                ]),
                "correct_answer": "Precision-Recall AUC (PR-AUC) and F-Beta score",
                "marks": 10.0
            },
            {
                "question_text": "What causes semantic drift in vector embedding retrieval systems, and how can it be mitigated?",
                "question_type": "written",
                "model_answer": "Semantic drift happens when document distributions change over time or queries deviate from training distribution. Mitigate by hybrid keyword+vector search, re-ranking with cross-encoders, and regular re-indexing.",
                "marks": 15.0
            }
        ]
    },
    {
        "title": "Cybersecurity, IAM & DevSecOps Fundamentals",
        "description": "Zero Trust network architecture, OWASP Top 10 web vulnerabilities, secret rotation, and SOC 2 Type II audit readiness.",
        "type": "MCQ",
        "time_limit_minutes": 45,
        "pass_score": 80.0,
        "status": "active",
        "questions": [
            {
                "question_text": "Which mitigation strategy fundamentally prevents Server-Side Request Forgery (SSRF) in cloud environments?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Enforcing IMDSv2 with hop-limit 1 and strict egress firewall allowlisting for outbound webhooks",
                    "Base64 encoding all outgoing request URLs",
                    "Using HTTPS instead of HTTP for outbound requests",
                    "Checking if input starts with http://"
                ]),
                "correct_answer": "Enforcing IMDSv2 with hop-limit 1 and strict egress firewall allowlisting for outbound webhooks",
                "marks": 10.0
            },
            {
                "question_text": "What is the primary security vulnerability mitigated by HTTP-only and SameSite=Lax flags on session cookies?",
                "question_type": "mcq",
                "options": json.dumps([
                    "Prevents XSS theft via document.cookie and mitigates unauthorized Cross-Site Request Forgery (CSRF)",
                    "Encrypts cookie contents over HTTP",
                    "Prevents SQL Injection attacks",
                    "Bypasses CORS restrictions"
                ]),
                "correct_answer": "Prevents XSS theft via document.cookie and mitigates unauthorized Cross-Site Request Forgery (CSRF)",
                "marks": 10.0
            }
        ]
    },
    {
        "title": "Technical Product Management & Roadmapping",
        "description": "Assessing product strategy, quantitative prioritization (RICE), API platform specifications, and customer discovery interviews.",
        "type": "Written",
        "time_limit_minutes": 60,
        "pass_score": 75.0,
        "status": "active",
        "questions": [
            {
                "question_text": "How do you calculate and apply RICE scoring to prioritize an enterprise integrations backlog?",
                "question_type": "written",
                "model_answer": "RICE = (Reach * Impact * Confidence) / Effort. Reach is customers impacted per quarter, Impact is 0.25-3 scale, Confidence is 50-100%, Effort is person-months. Sort items by score to prioritize high-value low-effort wins.",
                "marks": 20.0
            }
        ]
    },
    {
        "title": "QA Automation & Test Engineering with Playwright",
        "description": "End-to-end browser automation, flaky test resolution, visual regression suites, and CI/CD test parallelization.",
        "type": "Coding",
        "time_limit_minutes": 50,
        "pass_score": 70.0,
        "status": "active",
        "questions": [
            {
                "question_text": "Write a Playwright test verifying an async search input correctly renders results within 3 seconds without race conditions.",
                "question_type": "coding",
                "starter_code": "import { test, expect } from '@playwright/test';\n\ntest('verify async directory search', async ({ page }) => {\n  // Write test\n});",
                "programming_language": "typescript",
                "marks": 20.0
            }
        ]
    }
]

def seed_assessment_central():
    print("=" * 70)
    print("🎯 Phygitron 360 - Assessment Central Production Seeder")
    print("=" * 70)

    # 1. Credentials & Whitelist
    print("[1/5] Loading credentials and whitelisting IP...")
    tfvars = parse_tfvars(TFVARS_PATH)
    tfstate = parse_tfstate(TFSTATE_PATH)

    do_token = tfvars["do_token"]
    cluster_id = "45290c20-1fdb-4df2-9e69-222056b20874"
    app_id = tfstate.get("app_id", "b76805a6-ded3-4940-be8c-41f1a39e4365")

    db_host = tfstate["postgres_host"]
    db_port = tfstate.get("postgres_port", 25060)
    db_name = tfstate.get("postgres_database", "defaultdb")
    db_user = tfstate.get("postgres_user", "doadmin")
    db_pass = tfstate["postgres_password"]

    my_ip = get_public_ip()
    print(f"  → Public IP: {my_ip}")
    set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=my_ip)
    print("  → Firewall open. Waiting 5s...")
    time.sleep(5)

    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            sslmode="require",
            connect_timeout=15
        )
        conn.autocommit = False

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('SET search_path TO "tenant_dev", public')

            # Ensure verify and proctoring columns/tables exist on this connection
            cur.execute("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE assessment_assignments ADD COLUMN IF NOT EXISTS strike_count INTEGER DEFAULT 0")
            cur.execute("ALTER TABLE assessment_assignments ADD COLUMN IF NOT EXISTS terminated_by_proctor BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS proctoring_flags JSONB DEFAULT '[]'::jsonb")
            cur.execute('''
                CREATE TABLE IF NOT EXISTS proctoring_strikes (
                    id SERIAL PRIMARY KEY,
                    assignment_id INTEGER NOT NULL REFERENCES assessment_assignments(id) ON DELETE CASCADE,
                    violation_name TEXT NOT NULL,
                    flag_type TEXT DEFAULT 'proctoring_violation',
                    strike_index INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS proctoring_flags (
                    id SERIAL PRIMARY KEY,
                    assessment_result_id INTEGER REFERENCES assessment_results(id) ON DELETE CASCADE,
                    flag_type TEXT NOT NULL,
                    details JSONB,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cur.execute('SET search_path TO "tenant_dev", public')

            # Get admin user ID
            cur.execute("SELECT id FROM users WHERE username = 'cluxssy25@gmail.com' LIMIT 1")
            admin_row = cur.fetchone()
            admin_id = admin_row["id"] if admin_row else 1

            # Get sample employee user IDs
            cur.execute("SELECT id, username, employee_code FROM users WHERE employee_code IS NOT NULL AND employee_code != 'EMP0001' ORDER BY id ASC LIMIT 15")
            candidate_users = cur.fetchall()
            if not candidate_users:
                cur.execute("SELECT id, username FROM users LIMIT 15")
                candidate_users = cur.fetchall()

            print(f"[2/5] Creating {len(ASSESSMENTS)} enterprise assessments with question banks...")
            created_asm_ids = []

            for asm in ASSESSMENTS:
                # Check if assessment exists by title
                cur.execute("SELECT id FROM assessments WHERE title = %s", (asm["title"],))
                existing = cur.fetchone()
                if existing:
                    asm_id = existing["id"]
                    cur.execute("""
                        UPDATE assessments SET
                            description = %s, type = %s, time_limit_minutes = %s,
                            pass_score = %s, status = %s, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (asm["description"], asm["type"], asm["time_limit_minutes"], asm["pass_score"], asm["status"], asm_id))
                else:
                    cur.execute("""
                        INSERT INTO assessments (
                            title, description, type, time_limit_minutes, pass_score,
                            status, created_by, is_deleted
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, FALSE)
                        RETURNING id
                    """, (
                        asm["title"], asm["description"], asm["type"],
                        asm["time_limit_minutes"], asm["pass_score"], asm["status"], admin_id
                    ))
                    asm_id = cur.fetchone()["id"]

                created_asm_ids.append(asm_id)

                # Insert questions
                cur.execute("DELETE FROM assessment_questions WHERE assessment_id = %s", (asm_id,))
                for q in asm["questions"]:
                    cur.execute("""
                        INSERT INTO assessment_questions (
                            assessment_id, question_text, question_type, options,
                            correct_answer, starter_code, test_cases, programming_language,
                            model_answer, marks
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        asm_id, q["question_text"], q["question_type"],
                        q.get("options"), q.get("correct_answer"),
                        q.get("starter_code"), q.get("test_cases"),
                        q.get("programming_language"), q.get("model_answer"),
                        q.get("marks", 5.0)
                    ))

                print(f"  [+] Assessment #{asm_id}: {asm['title']} ({len(asm['questions'])} questions)")

            primary_asm_id = created_asm_ids[0]
            secondary_asm_id = created_asm_ids[1]

            print("[3/5] Setting up Submissions (2 passed) and Pending Review (6)...")
            # Clear old assignments and results for fresh clean demo
            cur.execute("DELETE FROM proctoring_strikes WHERE assignment_id IN (SELECT id FROM assessment_assignments WHERE assessment_id IN %s)", (tuple(created_asm_ids),))
            cur.execute("DELETE FROM proctoring_flags WHERE assessment_result_id IN (SELECT id FROM assessment_results WHERE assessment_id IN %s)", (tuple(created_asm_ids),))
            cur.execute("DELETE FROM assessment_results WHERE assessment_id IN %s", (tuple(created_asm_ids),))
            cur.execute("DELETE FROM assessment_assignments WHERE assessment_id IN %s", (tuple(created_asm_ids),))

            # ── 2 SUBMISSIONS WITH PASS-RATE DATA ──────────────────────────────
            # Candidate 1: Passed Full Stack React with 92% (Clean Proctoring)
            u1 = candidate_users[0]
            cur.execute("""
                INSERT INTO assessment_assignments (
                    assessment_id, user_id, assigned_by, status, strike_count, started_at
                ) VALUES (%s, %s, %s, 'graded', 0, CURRENT_TIMESTAMP - INTERVAL '2 hours')
                RETURNING id
            """, (primary_asm_id, u1["id"], admin_id))
            assign_id_1 = cur.fetchone()["id"]

            cur.execute("""
                INSERT INTO assessment_results (
                    assessment_id, user_id, answers, score, pass_status, feedback,
                    is_malpractice, time_taken_seconds, submitted_at
                ) VALUES (%s, %s, %s, 92.00, TRUE, %s, FALSE, 2140, CURRENT_TIMESTAMP - INTERVAL '1 hour')
                RETURNING id
            """, (
                primary_asm_id, u1["id"],
                json.dumps({"q1": "Correct answer chosen", "q2": "Clean implementation", "q3": "Pass"}),
                json.dumps({"summary": "Exceptional concurrency handling and state architecture.", "weak_skill_ids": []})
            ))
            res_id_1 = cur.fetchone()["id"]

            # Candidate 2: Passed Python Backend with 86% (Flagged Proctoring Session for Live Monitor Demo)
            u2 = candidate_users[1]
            cur.execute("""
                INSERT INTO assessment_assignments (
                    assessment_id, user_id, assigned_by, status, strike_count, started_at
                ) VALUES (%s, %s, %s, 'graded', 1, CURRENT_TIMESTAMP - INTERVAL '3 hours')
                RETURNING id
            """, (secondary_asm_id, u2["id"], admin_id))
            assign_id_2 = cur.fetchone()["id"]

            cur.execute("""
                INSERT INTO assessment_results (
                    assessment_id, user_id, answers, score, pass_status, feedback,
                    is_malpractice, time_taken_seconds, submitted_at
                ) VALUES (%s, %s, %s, 86.50, TRUE, %s, FALSE, 2800, CURRENT_TIMESTAMP - INTERVAL '2 hours')
                RETURNING id
            """, (
                secondary_asm_id, u2["id"],
                json.dumps({"q1": "Pool sizing explanation correct", "q2": "Asyncio wait correct"}),
                json.dumps({"summary": "Strong systems design; minor delay on query optimization.", "weak_skill_ids": []})
            ))
            res_id_2 = cur.fetchone()["id"]

            # Proctoring flags for Candidate 2
            cur.execute("""
                INSERT INTO proctoring_flags (assessment_result_id, flag_type, details)
                VALUES 
                (%s, 'tab_switch', '{\"reason\": \"Navigated away to secondary browser tab for 8 seconds\"}'),
                (%s, 'multiple_faces', '{\"reason\": \"Secondary person entered webcam background\"}')
            """, (res_id_2, res_id_2))

            print("  [✔] 2 Submissions created with 100% Pass Rate (92% & 86.5%) and proctoring evidence.")

            # ── 6 PENDING REVIEW / IN-PROGRESS FOR LIVE MONITOR ───────────────
            print("[4/5] Seeding Live Monitor candidates & 6 pending evaluations...")
            # Candidate 3: IN PROGRESS - 1 strike (Active test session currently ongoing)
            u3 = candidate_users[2]
            cur.execute("""
                INSERT INTO assessment_assignments (
                    assessment_id, user_id, assigned_by, status, strike_count, started_at
                ) VALUES (%s, %s, %s, 'in_progress', 1, CURRENT_TIMESTAMP - INTERVAL '14 minutes')
                RETURNING id
            """, (primary_asm_id, u3["id"], admin_id))
            asgn_3 = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO proctoring_strikes (assignment_id, violation_name, flag_type, strike_index)
                VALUES (%s, 'Tab switch detected (ALT+TAB)', 'tab_switch', 1)
            """, (asgn_3,))

            # Candidate 4: IN PROGRESS - Clean 0 strikes (Active test session currently ongoing)
            u4 = candidate_users[3]
            cur.execute("""
                INSERT INTO assessment_assignments (
                    assessment_id, user_id, assigned_by, status, strike_count, started_at
                ) VALUES (%s, %s, %s, 'in_progress', 0, CURRENT_TIMESTAMP - INTERVAL '28 minutes')
            """, (primary_asm_id, u4["id"], admin_id))

            # Candidate 5: TERMINATED BY PROCTOR (Reached 3 strikes)
            u5 = candidate_users[4]
            cur.execute("""
                INSERT INTO assessment_assignments (
                    assessment_id, user_id, assigned_by, status, strike_count, terminated_by_proctor, started_at
                ) VALUES (%s, %s, %s, 'terminated', 3, TRUE, CURRENT_TIMESTAMP - INTERVAL '45 minutes')
                RETURNING id
            """, (primary_asm_id, u5["id"], admin_id))
            asgn_5 = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO proctoring_strikes (assignment_id, violation_name, flag_type, strike_index)
                VALUES 
                (%s, 'Fullscreen mode exited', 'fullscreen_exit', 1),
                (%s, 'Secondary monitor connected', 'hardware_anomaly', 2),
                (%s, 'Persistent face absence > 30s', 'no_face', 3)
            """, (asgn_5, asgn_5, asgn_5))

            # Candidate 6, 7, 8: SUBMITTED (Awaiting manual code review / subjective evaluation)
            for i, u in enumerate(candidate_users[5:8]):
                cur.execute("""
                    INSERT INTO assessment_assignments (
                        assessment_id, user_id, assigned_by, status, strike_count, started_at
                    ) VALUES (%s, %s, %s, 'submitted', 0, CURRENT_TIMESTAMP - INTERVAL '5 hours')
                """, (created_asm_ids[i + 2], u["id"], admin_id))

            # ── 6 PENDING REVIEW QUERIES (AssessmentQueries) ──────────────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS assessment_queries (
                    id SERIAL PRIMARY KEY,
                    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
                    assessment_result_id INTEGER REFERENCES assessment_results(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    subject TEXT,
                    message TEXT NOT NULL,
                    status TEXT DEFAULT 'open', -- open, resolved, closed
                    response TEXT,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("DELETE FROM assessment_queries WHERE assessment_id IN %s", (tuple(created_asm_ids),))

            pending_queries = [
                ("Clarification on Question #3 Debounce Timing", "Does the debounce function need to support immediate leading edge invocation as well as trailing?", primary_asm_id, res_id_1, candidate_users[0]["id"]),
                ("Connection Pool Spindle Sizing Query", "In virtualized EBS environments, how should spindle count factor into effective connection count?", secondary_asm_id, res_id_2, candidate_users[1]["id"]),
                ("WCAG 2.1 Contrast Calculation on Disabled Inputs", "Should disabled form controls strictly adhere to 4.5:1 or are they exempt under section 1.4.3?", created_asm_ids[3], None, candidate_users[2]["id"]),
                ("PR-AUC vs ROC-AUC Question Clarification", "Question mentions 0.5% fraud rate. Can SMOTE oversampling be discussed in the written response?", created_asm_ids[4], None, candidate_users[3]["id"]),
                ("IMDSv2 Hop-Limit on Containerized Pods", "In EKS with host networking disabled, does hop limit 1 prevent pod credential access?", created_asm_ids[5], None, candidate_users[4]["id"]),
                ("Playwright Asynchronous Race Condition Query", "Are networkidle wait states acceptable or should locator assertions be preferred?", created_asm_ids[7], None, candidate_users[5]["id"])
            ]

            for q_subject, q_msg, q_asm_id, q_res_id, q_uid in pending_queries:
                cur.execute("""
                    INSERT INTO assessment_queries (
                        assessment_id, assessment_result_id, user_id, subject, message, status
                    ) VALUES (%s, %s, %s, %s, %s, 'open')
                """, (q_asm_id, q_res_id, q_uid, q_subject, q_msg))

            print("  [✔] 6 Assessment Queries seeded in 'open' status awaiting review.")

            # ── GLOBAL PROCTORING DEFAULTS IN TENANTS.SETTINGS ───────────────
            proctoring_defaults = {
                "fullscreen_enforcement": True,
                "max_tab_switches": 2,
                "face_detection": True,
                "audio_detection": True,
                "multiple_faces_action": "strike",
                "strictness_level": "balanced",
                "webcam_snapshots_interval_sec": 30
            }
            cur.execute("""
                UPDATE public.tenants
                SET settings = jsonb_set(
                    COALESCE(settings, '{}'::jsonb),
                    '{proctoring_defaults}',
                    %s::jsonb
                )
                WHERE id = 'tenant_dev'
            """, (json.dumps(proctoring_defaults),))

            conn.commit()
            print("[5/5] Transaction committed! Assessment Central is fully populated.")

    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
        print(f"[✘] Database seeding failed: {e}")
        raise
    finally:
        if 'conn' in locals() and conn:
            conn.close()
        print("Revoking firewall access from DigitalOcean cluster...")
        try:
            set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=None)
            print("Firewall locked down.")
        except Exception as fe:
            print(f"Warning: {fe}")

    print("\n🎉 Done! Assessment Central demo data is live on production.")

if __name__ == "__main__":
    seed_assessment_central()
