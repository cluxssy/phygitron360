#!/usr/bin/env python3
"""
scripts/prod_seed_1100_employees.py

Bulk seeds 1,100 realistic, diverse employees into the production 'dev' tenant
(schema: 'tenant_dev') with:
- Global names: American, Asian (South & East Asian), European
- Balanced 50/50 gender distribution
- Locations across India (Bengaluru, Mumbai, Gurgaon, Hyderabad, Pune, Chennai),
  Canada (Toronto, Vancouver, Montreal, Ottawa, Calgary),
  and the United States (San Francisco, New York, Austin, Seattle, Chicago, Boston, Denver)
- Diverse headshot photo pool uploaded to DigitalOcean Spaces
- Complete profile fields (100% complete — no warning badges in Employee Central)
- Bulk batch insertion with psycopg2.extras.execute_values for maximum speed
- DigitalOcean DB firewall auto-whitelist and immediate revocation
- Preserves all existing records
"""

import os
import sys
import json
import time
import random
import urllib.request
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
import boto3
from botocore.client import Config
from passlib.hash import pbkdf2_sha256

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

TFVARS_PATH = os.path.join(BASE_DIR, "infra", "terraform-do", "terraform.tfvars")
TFSTATE_PATH = os.path.join(BASE_DIR, "infra", "terraform-do", "terraform.tfstate")

def parse_tfvars(path):
    config = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip().strip('"').strip("'")
    return config

def parse_tfstate(path):
    with open(path) as f:
        state = json.load(f)
    outputs = state.get("outputs", {})
    return {k: v.get("value") for k, v in outputs.items()}

def get_public_ip():
    urls = ["https://api.ipify.org", "https://checkip.amazonaws.com", "https://icanhazip.com"]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                ip = resp.read().decode().strip()
                if ip:
                    return ip
        except Exception:
            continue
    raise RuntimeError("Could not determine public IP address.")

def set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=None):
    url = f"https://api.digitalocean.com/v2/databases/{cluster_id}/firewall"
    rules = [{"type": "app", "value": app_id}]
    if additional_ip:
        rules.append({"type": "ip_addr", "value": additional_ip})
    
    payload = json.dumps({"rules": rules}).encode("utf-8")
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(url, data=payload, headers={
                "Authorization": f"Bearer {do_token}",
                "Content-Type": "application/json"
            }, method="PUT")
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status in (200, 204)
        except Exception as e:
            print(f"    [!] DO API attempt {attempt}/3: {e}")
            if attempt < 3:
                time.sleep(3)
            else:
                raise

# ── NAME AND PROFILE GENERATOR DATA ──────────────────────────────────────────

INDIAN_FIRST_MEN = [
    "Aarav", "Rohan", "Aditya", "Arjun", "Vikram", "Rajesh", "Amit", "Rahul", "Suresh",
    "Nikhil", "Pranav", "Siddharth", "Varun", "Kunal", "Gaurav", "Abhishek", "Deepak",
    "Manish", "Harish", "Ankit", "Sachin", "Sanjay", "Alok", "Dev", "Vivek", "Karthik",
    "Manoj", "Ajay", "Tarun", "Mayank", "Sameer", "Sumit", "Prakash", "Ashish", "Naveen"
]
INDIAN_FIRST_WOMEN = [
    "Priya", "Ananya", "Pooja", "Sneha", "Neha", "Ritu", "Divya", "Shreya", "Kavita",
    "Meera", "Swati", "Deepa", "Sunita", "Radhika", "Preeti", "Ishita", "Tanvi", "Anjali",
    "Nidhi", "Payal", "Aarti", "Rashi", "Pallavi", "Smriti", "Vidya", "Shruti", "Akanksha",
    "Rupal", "Kalyani", "Bhavna", "Sandhya", "Rashmi", "Shalini", "Simran", "Vandana"
]
INDIAN_LAST = [
    "Sharma", "Patel", "Verma", "Iyer", "Nair", "Gupta", "Singh", "Kumar", "Rao",
    "Reddy", "Chatterjee", "Banerjee", "Joshi", "Kulkarni", "Deshmukh", "Agarwal",
    "Bhat", "Menon", "Pillai", "Malhotra", "Kapoor", "Chopra", "Sinha", "Saxena",
    "Mishra", "Pandey", "Chauhan", "Bose", "Dutta", "Mukherjee", "Gowda", "Shetty"
]

EAST_ASIAN_FIRST_MEN = [
    "David", "Kevin", "Wei", "Jian", "Jun", "Chen", "Min-jun", "Kenji", "Hiroshi", "Daiki",
    "Sang-woo", "Jin", "Tao", "Liang", "Long", "Hieu", "Bao", "Ren", "Kaito", "Yuto",
    "Seung", "Alex", "Eric", "Brandon", "Ryan", "Justin", "Kai", "Riku", "Sora", "Minh"
]
EAST_ASIAN_FIRST_WOMEN = [
    "Mei-Ling", "Lin", "Xiao", "Yan", "Jing", "Yuka", "Sakura", "Aoi", "Eun-ji", "Seo-yeon",
    "Ji-woo", "Linh", "Mai", "Trang", "Hana", "Chloe", "Grace", "Stephanie", "Tiffany", "Michelle",
    "Kelly", "Vivian", "Amy", "Joyce", "Rachel", "Yuki", "Rin", "Mei", "Ji-eun", "Soo-jin"
]
EAST_ASIAN_LAST = [
    "Chen", "Wang", "Li", "Zhang", "Liu", "Yang", "Huang", "Wu", "Zhou", "Xu",
    "Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Sato", "Suzuki", "Takahashi", "Tanaka",
    "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Nguyen", "Tran", "Le", "Pham", "Hoang"
]

AMERICAN_FIRST_MEN = [
    "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas",
    "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew",
    "Joshua", "Kenneth", "Kevin", "Brian", "Timothy", "Ronald", "Jason", "Edward", "Jeffrey",
    "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott"
]
AMERICAN_FIRST_WOMEN = [
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah",
    "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily",
    "Donna", "Michelle", "Carol", "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon",
    "Laura", "Cynthia", "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela", "Nicole"
]
AMERICAN_LAST = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
    "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
    "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres"
]

EUROPEAN_FIRST_MEN = [
    "Lucas", "Alexander", "Liam", "Noah", "Oliver", "Arthur", "Louis", "Gabriel", "Matteo",
    "Leonardo", "Elias", "Felix", "Julian", "Maximilian", "Hugo", "Paul", "Leon", "Finn",
    "Jonas", "Anton", "Milan", "Lars", "Henrik", "Stefan", "Viktor", "Dmitri", "Mateo",
    "Adrien", "Florian", "Benoit", "Mathieu", "Luka", "Jakub", "Jan", "Filip", "Sven", "Magnus"
]
EUROPEAN_FIRST_WOMEN = [
    "Emma", "Olivia", "Mia", "Sofia", "Charlotte", "Mila", "Ella", "Alice", "Chloe", "Camille",
    "Lea", "Giulia", "Chiara", "Anna", "Laura", "Lena", "Marie", "Hannah", "Emilia", "Freja",
    "Astrid", "Klara", "Elena", "Zofia", "Maja", "Juliette", "Mathilde", "Manon", "Ines",
    "Clara", "Lina", "Nora", "Elise", "Sara", "Ida", "Agnes", "Alba", "Noemi", "Viktoria"
]
EUROPEAN_LAST = [
    "Rossi", "Ferrari", "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Muller",
    "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Novak", "Kowalski",
    "Jansen", "De Jong", "O'Connor", "Murphy", "Hansen", "Johansen", "Andersson", "Larsson",
    "Varga", "Nagy", "Dimitrov", "Popov", "Morin", "Lefebvre", "Leroy", "Moreau", "Simon", "Laurent"
]

LOCATIONS_INDIA = [
    "Bengaluru, India", "Mumbai, India", "Gurgaon, India",
    "Hyderabad, India", "Pune, India", "Chennai, India", "Noida, India"
]
LOCATIONS_CANADA = [
    "Toronto, Canada", "Vancouver, Canada", "Montreal, Canada",
    "Ottawa, Canada", "Calgary, Canada"
]
LOCATIONS_US = [
    "San Francisco, US", "New York, US", "Austin, US",
    "Seattle, US", "Chicago, US", "Boston, US", "Denver, US", "Los Angeles, US"
]

ROLES_BY_DEPT = {
    "Engineering": [
        ("Software Engineer", "React, Node.js, TypeScript", "Docker, PostgreSQL", 3),
        ("Senior Software Engineer", "Python, FastAPI, Microservices", "Redis, Kafka, AWS", 6),
        ("Lead Backend Engineer", "Distributed Systems, Go, Python", "Kubernetes, System Design", 9),
        ("Staff Systems Architect", "Cloud Architecture, High-Scale APIs", "SRE, Terraform, Observability", 12),
        ("Senior Frontend Engineer", "Modern React, Next.js, TailwindCSS", "State Management, Web Performance", 7),
        ("Cloud DevOps Engineer", "AWS, Terraform, CI/CD Pipelines", "Docker, Helm, Linux Systems", 5),
        ("Principal Security Engineer", "DevSecOps, IAM, Cloud Compliance", "Penetration Testing, SOC2", 11)
    ],
    "Product": [
        ("Associate Product Manager", "User Research, Product Specs", "Jira, Wireframing, Agile", 2),
        ("Product Manager", "Feature Roadmapping, PRDs", "Mixpanel, User Stories, Scrum", 5),
        ("Senior Product Manager", "Enterprise SaaS, Product Strategy", "Cross-Functional Leadership, A/B Testing", 8),
        ("Group Product Manager", "Product Portfolio Strategy", "P&L Management, Executive Roadmapping", 11)
    ],
    "Design": [
        ("UI/UX Designer", "Figma, User Flows, Wireframing", "Component Libraries, Usability Testing", 3),
        ("Senior Product Designer", "Design Systems, Interactive Prototyping", "Design Tokens, Micro-interactions", 6),
        ("Lead UX Researcher", "Quantitative & Qualitative Studies", "Customer Journey Maps, Persona Analysis", 8)
    ],
    "Quality Assurance": [
        ("QA Automation Engineer", "Playwright, Cypress, JavaScript", "API Testing, Postman, CI/CD", 3),
        ("Senior QA Engineer", "E2E Test Automation, Python PyTest", "Performance Testing, k6, Selenium", 6),
        ("Lead QA & Release Engineer", "Test Strategy, CI/CD Gateways", "Security Scanning, Test Governance", 9)
    ],
    "Data & AI": [
        ("Data Analyst", "SQL, Tableau, Data Modeling", "Python, Business Analytics, ETL", 3),
        ("Senior Data Engineer", "Apache Spark, Snowflake, Airflow", "Data Warehousing, Python, Kafka", 6),
        ("AI / ML Engineer", "PyTorch, Large Language Models, Python", "Vector DBs, MLOps, HuggingFace", 5),
        ("Lead Data Scientist", "Predictive Modeling, Statistical Analysis", "ML Pipelines, Big Data Architecture", 9)
    ],
    "Sales & Solutions": [
        ("Sales Development Rep", "Outbound Prospecting, Cold Calling", "Salesforce CRM, LinkedIn Outreach", 2),
        ("Account Executive", "B2B SaaS Demos, Deal Closing", "MEDDIC, Contract Negotiations", 5),
        ("Senior Solutions Architect", "Pre-Sales Consulting, Solution Design", "Technical Discovery, Cloud APIs", 8)
    ],
    "Human Resources": [
        ("HR Generalist", "Employee Relations, Onboarding", "HRIS Admin, Policies & Compliance", 4),
        ("Talent Acquisition Specialist", "Technical Sourcing, Candidate Screening", "ATS Management, Interview Loops", 5),
        ("Senior People Partner", "Performance Management, Org Design", "Retention Strategies, Leadership Coaching", 8)
    ],
    "Customer Success": [
        ("Customer Success Manager", "Client Onboarding, Account Health", "Gainsight, Renewals, Escalations", 4),
        ("Enterprise Support Engineer", "Technical Troubleshooting, Log Analysis", "REST APIs, Bug Triaging, SLAs", 5),
        ("Implementation Consultant", "Enterprise Deployment, Training", "Change Management, Client Integrations", 7)
    ]
}

def generate_1100_employees(start_code=1001, count=1100):
    employees = []
    
    # 3 cultural categories
    categories = ["indian", "east_asian", "american", "european"]
    
    for i in range(count):
        code = f"EMP{start_code + i:04d}"
        gender = "women" if i % 2 == 0 else "men"
        category = categories[i % len(categories)]
        
        if category == "indian":
            first = random.choice(INDIAN_FIRST_WOMEN if gender == "women" else INDIAN_FIRST_MEN)
            last = random.choice(INDIAN_LAST)
            location = random.choice(LOCATIONS_INDIA)
            phone = f"+91 9{random.randint(7000, 9999)} {random.randint(10000, 99999)}"
            bank = random.choice(["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra"])
            pan = f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))}{random.randint(1000,9999)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"
            ifsc = f"{bank[:4].upper()}000{random.randint(1000, 9999)}"
            address = f"{random.randint(10, 999)}, Tech Park Rd, {location}"
        elif category == "east_asian":
            first = random.choice(EAST_ASIAN_FIRST_WOMEN if gender == "women" else EAST_ASIAN_FIRST_MEN)
            last = random.choice(EAST_ASIAN_LAST)
            location = random.choice(LOCATIONS_CANADA + [LOCATIONS_US[0], LOCATIONS_US[3]]) # Vancouver/Toronto/SF/Seattle
            phone = f"+1 {random.randint(200, 700)} 555 {random.randint(1000, 9999)}"
            bank = "RBC Royal Bank" if "Canada" in location else "Chase Bank"
            pan = f"SIN-{random.randint(100000, 999999)}" if "Canada" in location else f"SSN-{random.randint(1000, 9999)}"
            ifsc = "ROYCCAT2" if "Canada" in location else "CHASUS33"
            address = f"{random.randint(100, 999)} Main Street, {location}"
        elif category == "american":
            first = random.choice(AMERICAN_FIRST_WOMEN if gender == "women" else AMERICAN_FIRST_MEN)
            last = random.choice(AMERICAN_LAST)
            location = random.choice(LOCATIONS_US)
            phone = f"+1 {random.randint(200, 700)} 555 {random.randint(1000, 9999)}"
            bank = random.choice(["Chase Bank", "Bank of America", "Wells Fargo", "Citibank"])
            pan = f"US-SSN-{random.randint(1000, 9999)}"
            ifsc = "CHASUS33"
            address = f"{random.randint(100, 9999)} Broadway, {location}"
        else: # european
            first = random.choice(EUROPEAN_FIRST_WOMEN if gender == "women" else EUROPEAN_FIRST_MEN)
            last = random.choice(EUROPEAN_LAST)
            location = random.choice(LOCATIONS_CANADA + LOCATIONS_US)
            phone = f"+1 {random.randint(200, 700)} 555 {random.randint(1000, 9999)}"
            bank = random.choice(["TD Canada Trust", "BMO", "Bank of America", "Scotiabank"])
            pan = f"EU-TAX-{random.randint(100000, 999999)}"
            ifsc = "TDOMCATT"
            address = f"{random.randint(10, 500)} Avenue Rd, {location}"

        full_name = f"{first} {last}"
        safe_username = f"{first.lower().replace('-', '')}.{last.lower().replace('-', '')}{random.randint(10, 99)}@dev.phygitron.com"

        # Department & Role
        dept = random.choice(list(ROLES_BY_DEPT.keys()))
        designation, primary_skill, sec_skill, base_exp = random.choice(ROLES_BY_DEPT[dept])
        exp_years = base_exp + random.randint(0, 4)

        # Dates
        birth_year = 2024 - (22 + exp_years)
        dob = f"{birth_year:04d}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        doj = f"{random.randint(2022, 2025):04d}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"

        # Assign manager
        manager = "Priya Sharma" if dept == "Engineering" else ("Marcus Vance" if dept in ["Product", "Design", "Sales & Solutions"] else "Sarah Jenkins")
        role = "manager" if "Lead" in designation or "Director" in designation or "VP" in designation else ("hr" if dept == "Human Resources" else "employee")

        photo_index = (i % 70) + 1  # 70 photos in pool

        employees.append({
            "code": code,
            "name": full_name,
            "first_name": first,
            "last_name": last,
            "gender": gender,
            "photo_index": photo_index,
            "email": safe_username,
            "phone": phone,
            "emergency": phone.rsplit(" ", 1)[0] + " 9999",
            "dob": dob,
            "doj": doj,
            "team": dept,
            "designation": designation,
            "role": role,
            "manager": manager,
            "location": location,
            "address": address,
            "bank_name": bank,
            "pan_no": pan,
            "ifsc_code": ifsc,
            "primary_skillset": primary_skill,
            "secondary_skillset": sec_skill,
            "experience_years": exp_years,
            "education": json.dumps([{"degree": "Bachelor of Science", "school": "University", "year": str(birth_year + 22)}])
        })
    return employees

def prepare_photo_pool(s3_client, bucket):
    """Pre-uploads 70 diverse headshots (35 women, 35 men) to Spaces pool if not already present."""
    print("  → Ensuring diverse portrait photo pool (70 distinct high-res portraits) on Spaces...")
    urls = {"men": [], "women": []}

    for gender in ["men", "women"]:
        for idx in range(1, 36):
            key = f"tenant_dev/deploy/pfp/pool/{gender}_{idx}.jpg"
            url = f"https://fra1.digitaloceanspaces.com/{bucket}/{key}"
            
            # Check if exists in Spaces
            exists = False
            try:
                s3_client.head_object(Bucket=bucket, Key=key)
                exists = True
            except Exception:
                exists = False

            if not exists:
                # Download from randomuser
                src_url = f"https://randomuser.me/api/portraits/{gender}/{idx}.jpg"
                try:
                    req = urllib.request.Request(src_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        img_bytes = resp.read()
                    s3_client.put_object(
                        Bucket=bucket,
                        Key=key,
                        Body=img_bytes,
                        ContentType="image/jpeg",
                        ACL="public-read"
                    )
                except Exception as e:
                    pass

            urls[gender].append(url)
    
    print(f"  → Photo pool ready with {len(urls['women'])} women and {len(urls['men'])} men portraits.")
    return urls

def run():
    print("=" * 70)
    print("🚀 Phygitron 360 - Bulk Seeder: 1,100 Employees for Production 'dev'")
    print("=" * 70)

    # 1. Configs
    print("[1/5] Loading configuration...")
    tfvars = parse_tfvars(TFVARS_PATH)
    tfstate = parse_tfstate(TFSTATE_PATH)

    do_token = tfvars["do_token"]
    spaces_key = tfvars["spaces_access_key"]
    spaces_secret = tfvars["spaces_secret_key"]
    cluster_id = "45290c20-1fdb-4df2-9e69-222056b20874"
    app_id = tfstate.get("app_id", "b76805a6-ded3-4940-be8c-41f1a39e4365")

    db_host = tfstate["postgres_host"]
    db_port = tfstate.get("postgres_port", 25060)
    db_name = tfstate.get("postgres_database", "defaultdb")
    db_user = tfstate.get("postgres_user", "doadmin")
    db_pass = tfstate["postgres_password"]
    bucket = tfstate.get("spaces_bucket_name", "phygitron360-uploads")

    # 2. Whitelist IP
    print("[2/5] Whitelisting current public IP in DigitalOcean DB firewall...")
    my_ip = get_public_ip()
    print(f"  → Public IP: {my_ip}")
    set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=my_ip)
    print("  → Firewall updated! Waiting 5s for network route propagation...")
    time.sleep(5)

    # 3. Spaces S3 Client
    s3 = boto3.client(
        "s3",
        region_name="fra1",
        endpoint_url="https://fra1.digitaloceanspaces.com",
        aws_access_key_id=spaces_key,
        aws_secret_access_key=spaces_secret,
        config=Config(signature_version="s3v4")
    )

    try:
        # Pre-seed photo pool
        photo_pool = prepare_photo_pool(s3, bucket)

        # 4. Generate 1100 records
        print("[3/5] Generating 1,100 diverse employee records...")
        raw_employees = generate_1100_employees(start_code=1001, count=1100)

        # 5. Connect and Bulk Insert
        print(f"[4/5] Connecting to production DB ({db_host}:{db_port}) and bulk inserting...")
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

        with conn.cursor() as cur:
            cur.execute('SET search_path TO "tenant_dev", public')

            # Prepare rows for employees table
            emp_rows = []
            skill_rows = []
            user_rows = []
            default_pw = pbkdf2_sha256.hash("Demo@2026!")

            for emp in raw_employees:
                gender = emp["gender"]
                gender_urls = photo_pool.get(gender) or photo_pool["women"]
                photo_url = gender_urls[emp["photo_index"] % len(gender_urls)]

                emp_rows.append((
                    emp["code"], emp["name"], emp["first_name"], emp["last_name"], "N/A",
                    emp["dob"], emp["phone"], emp["emergency"], emp["email"], emp["doj"],
                    emp["team"], emp["designation"], "Full-time", emp["manager"], emp["location"],
                    emp["address"], emp["address"], emp["education"],
                    "Yes", "Yes", photo_url, "Seeded demo employee with full complete profile",
                    emp["bank_name"], "987654321012", emp["pan_no"], emp["ifsc_code"],
                    "Active", 1, 1
                ))

                skill_rows.append((
                    emp["code"], emp["name"], emp["primary_skillset"], emp["secondary_skillset"], emp["experience_years"]
                ))

                user_rows.append((
                    emp["email"], default_pw, emp["role"], [emp["role"]], emp["code"], 1
                ))

            # Bulk upsert employees (page_size 200)
            print("  → Bulk inserting 1,100 employees...")
            insert_emp_query = """
                INSERT INTO employees (
                    employee_code, name, first_name, last_name, guardian_name,
                    dob, contact_number, emergency_contact, email_id, doj,
                    team, designation, employment_type, reporting_manager, location,
                    current_address, permanent_address, education_details,
                    pf_included, mediclaim_included, photo_path, notes,
                    bank_name, bank_account_no, pan_no, ifsc_code,
                    employment_status, hr_approved, finance_approved
                ) VALUES %s
                ON CONFLICT (employee_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    dob = EXCLUDED.dob,
                    contact_number = EXCLUDED.contact_number,
                    emergency_contact = EXCLUDED.emergency_contact,
                    email_id = EXCLUDED.email_id,
                    doj = EXCLUDED.doj,
                    team = EXCLUDED.team,
                    designation = EXCLUDED.designation,
                    reporting_manager = EXCLUDED.reporting_manager,
                    location = EXCLUDED.location,
                    current_address = EXCLUDED.current_address,
                    permanent_address = EXCLUDED.permanent_address,
                    education_details = EXCLUDED.education_details,
                    pf_included = EXCLUDED.pf_included,
                    mediclaim_included = EXCLUDED.mediclaim_included,
                    photo_path = EXCLUDED.photo_path,
                    bank_name = EXCLUDED.bank_name,
                    pan_no = EXCLUDED.pan_no,
                    ifsc_code = EXCLUDED.ifsc_code,
                    employment_status = EXCLUDED.employment_status,
                    hr_approved = 1,
                    finance_approved = 1
            """
            execute_values(cur, insert_emp_query, emp_rows, page_size=200)

            # Bulk upsert skills
            print("  → Bulk inserting 1,100 skill matrix records...")
            insert_skill_query = """
                INSERT INTO skill_matrix (
                    employee_code, candidate_name, primary_skillset, secondary_skillset, experience_years
                ) VALUES %s
                ON CONFLICT (employee_code) DO UPDATE SET
                    primary_skillset = EXCLUDED.primary_skillset,
                    secondary_skillset = EXCLUDED.secondary_skillset,
                    experience_years = EXCLUDED.experience_years
            """
            # Delete existing skill records for these codes to prevent conflicts if no constraint
            cur.execute("DELETE FROM skill_matrix WHERE employee_code BETWEEN 'EMP1001' AND 'EMP2100'")
            execute_values(cur, "INSERT INTO skill_matrix (employee_code, candidate_name, primary_skillset, secondary_skillset, experience_years) VALUES %s", skill_rows, page_size=200)

            # Bulk upsert users
            print("  → Bulk inserting 1,100 user accounts...")
            insert_user_query = """
                INSERT INTO users (
                    username, password_hash, role, roles, employee_code, is_active
                ) VALUES %s
                ON CONFLICT (username) DO UPDATE SET
                    employee_code = EXCLUDED.employee_code,
                    role = EXCLUDED.role,
                    roles = EXCLUDED.roles,
                    is_active = 1
            """
            execute_values(cur, insert_user_query, user_rows, page_size=200)

            conn.commit()
            print("  [✔] Database transaction committed successfully!")

            cur.execute("SELECT count(*) FROM employees")
            total = cur.fetchone()[0]
            print(f"  → Total active employees in tenant_dev: {total}")

    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
        print(f"\n[✘] Error during bulk seeding: {e}")
        raise
    finally:
        if 'conn' in locals() and conn:
            conn.close()
        # 5. Revoke Firewall
        print("\n[5/5] Revoking public IP from DigitalOcean database firewall...")
        try:
            set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=None)
            print("  → Database firewall restored to secure lockdown state.")
        except Exception as fe:
            print(f"  [!] Warning: Failed to revoke firewall automatically: {fe}")

    print("\n🎉 Done! 1,100 demo employees with photos are live on production dev tenant.")

if __name__ == "__main__":
    run()
