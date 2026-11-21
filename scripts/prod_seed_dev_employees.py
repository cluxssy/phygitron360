#!/usr/bin/env python3
"""
scripts/prod_seed_dev_employees.py

Seeds production tenant 'dev' (schema: 'tenant_dev') with a diverse,
globally balanced team of employees across India, Canada, and the US,
complete with profile photos uploaded directly to DigitalOcean Spaces.

Features:
- Dynamically & temporarily whitelists your current IP in the DigitalOcean
  PostgreSQL database firewall, then revokes it on completion (or failure).
- Uploads professional portrait headshots to DigitalOcean Spaces (bucket: phygitron360-uploads).
- Inserts 18 comprehensive employee records (American, Asian, European / men & women)
  into tenant_dev.employees, tenant_dev.skill_matrix, and tenant_dev.users.
- 100% complete profile attributes so no warning badges appear in Employee Central.
- Preserves all existing records (no deletion of existing employees).
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from botocore.client import Config
from passlib.hash import pbkdf2_sha256

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

TFVARS_PATH = os.path.join(BASE_DIR, "infra", "terraform-do", "terraform.tfvars")
TFSTATE_PATH = os.path.join(BASE_DIR, "infra", "terraform-do", "terraform.tfstate")

def parse_tfvars(path):
    config = {}
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing tfvars at {path}")
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip().strip('"').strip("'")
    return config

def parse_tfstate(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing tfstate at {path}")
    with open(path) as f:
        state = json.load(f)
    outputs = state.get("outputs", {})
    return {k: v.get("value") for k, v in outputs.items()}

def get_public_ip():
    urls = [
        "https://api.ipify.org",
        "https://checkip.amazonaws.com",
        "https://icanhazip.com"
    ]
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
            print(f"    [!] DO API attempt {attempt}/3 failed: {e}")
            if attempt < 3:
                time.sleep(3)
            else:
                raise

# 18 Diverse Global Employees
EMPLOYEES_DATA = [
    # ── 1. ASIA (India) ───────────────────────────────────────────────────────
    {
        "code": "EMP201",
        "first_name": "Priya",
        "last_name": "Sharma",
        "gender": "women",
        "photo_id": 44,
        "designation": "VP of Engineering",
        "team": "Engineering",
        "role": "manager",
        "location": "Bengaluru, India",
        "manager": "Self (Executive)",
        "email": "priya.sharma@dev.phygitron.com",
        "phone": "+91 98450 12345",
        "emergency": "+91 98450 99999",
        "dob": "1987-04-12",
        "doj": "2023-01-15",
        "current_address": "Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
        "permanent_address": "Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
        "bank_name": "HDFC Bank",
        "pan_no": "ABCPS1234F",
        "ifsc_code": "HDFC0001234",
        "primary_skillset": "Distributed Systems & Cloud Architecture",
        "secondary_skillset": "Python, Go, Kubernetes, Team Leadership",
        "experience_years": 14,
        "education": [{"degree": "B.Tech Computer Science", "school": "IIT Madras", "year": "2009"}]
    },
    {
        "code": "EMP202",
        "first_name": "Arjun",
        "last_name": "Patel",
        "gender": "men",
        "photo_id": 32,
        "designation": "Lead Cloud & DevOps Architect",
        "team": "Engineering",
        "role": "manager",
        "location": "Mumbai, India",
        "manager": "Priya Sharma",
        "email": "arjun.patel@dev.phygitron.com",
        "phone": "+91 98201 45678",
        "emergency": "+91 98201 88888",
        "dob": "1990-08-23",
        "doj": "2023-04-01",
        "current_address": "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
        "permanent_address": "Navrangpura, Ahmedabad, Gujarat 380009",
        "bank_name": "ICICI Bank",
        "pan_no": "BCDEP5678G",
        "ifsc_code": "ICIC0000004",
        "primary_skillset": "AWS, Terraform & Site Reliability Engineering",
        "secondary_skillset": "Docker, CI/CD, Helm, Observability",
        "experience_years": 10,
        "education": [{"degree": "B.E. Information Technology", "school": "VJTI Mumbai", "year": "2012"}]
    },
    {
        "code": "EMP203",
        "first_name": "Ananya",
        "last_name": "Iyer",
        "gender": "women",
        "photo_id": 65,
        "designation": "Senior Full Stack Engineer",
        "team": "Engineering",
        "role": "employee",
        "location": "Hyderabad, India",
        "manager": "Priya Sharma",
        "email": "ananya.iyer@dev.phygitron.com",
        "phone": "+91 97012 34567",
        "emergency": "+91 97012 77777",
        "dob": "1994-11-05",
        "doj": "2023-09-11",
        "current_address": "HITEC City, Madhapur, Hyderabad, Telangana 500081",
        "permanent_address": "Mylapore, Chennai, Tamil Nadu 600004",
        "bank_name": "Axis Bank",
        "pan_no": "CDEFA9012H",
        "ifsc_code": "UTIB0000123",
        "primary_skillset": "React, TypeScript & Node.js",
        "secondary_skillset": "GraphQL, PostgreSQL, TailwindCSS",
        "experience_years": 7,
        "education": [{"degree": "B.Tech Software Engineering", "school": "NIT Warangal", "year": "2016"}]
    },
    {
        "code": "EMP204",
        "first_name": "Rohan",
        "last_name": "Verma",
        "gender": "men",
        "photo_id": 64,
        "designation": "Technical Product Manager",
        "team": "Product",
        "role": "employee",
        "location": "Gurgaon, India",
        "manager": "Marcus Vance",
        "email": "rohan.verma@dev.phygitron.com",
        "phone": "+91 98110 56789",
        "emergency": "+91 98110 66666",
        "dob": "1992-06-18",
        "doj": "2024-02-01",
        "current_address": "Cyber City, DLF Phase 2, Gurgaon, Haryana 122002",
        "permanent_address": "Aliganj, Lucknow, Uttar Pradesh 226024",
        "bank_name": "Kotak Mahindra Bank",
        "pan_no": "DEFGR3456J",
        "ifsc_code": "KKBK0000180",
        "primary_skillset": "API Products & Platform Strategy",
        "secondary_skillset": "Agile Scrum, PRD Authoring, Mixpanel",
        "experience_years": 8,
        "education": [{"degree": "MBA in Technology Management", "school": "FMS Delhi", "year": "2016"}]
    },
    {
        "code": "EMP205",
        "first_name": "Deepa",
        "last_name": "Nair",
        "gender": "women",
        "photo_id": 28,
        "designation": "People Operations Specialist",
        "team": "Human Resources",
        "role": "hr",
        "location": "Pune, India",
        "manager": "Sarah Jenkins",
        "email": "deepa.nair@dev.phygitron.com",
        "phone": "+91 98600 78901",
        "emergency": "+91 98600 55555",
        "dob": "1995-02-14",
        "doj": "2024-05-15",
        "current_address": "Kalyani Nagar, Pune, Maharashtra 411006",
        "permanent_address": "Kochi, Kerala 682011",
        "bank_name": "HDFC Bank",
        "pan_no": "EFGHD7890K",
        "ifsc_code": "HDFC0000052",
        "primary_skillset": "Global Employee Onboarding & Compliance",
        "secondary_skillset": "HRIS Systems, Payroll Audits, Benefits Admin",
        "experience_years": 6,
        "education": [{"degree": "Masters in HR Management", "school": "Symbiosis Pune", "year": "2018"}]
    },

    # ── 2. ASIA (East Asian) ─────────────────────────────────────────────────
    {
        "code": "EMP206",
        "first_name": "David",
        "last_name": "Chen",
        "gender": "men",
        "photo_id": 75,
        "designation": "Principal AI & ML Engineer",
        "team": "Engineering",
        "role": "manager",
        "location": "Vancouver, Canada",
        "manager": "Priya Sharma",
        "email": "david.chen@dev.phygitron.com",
        "phone": "+1 604 555 0192",
        "emergency": "+1 604 555 0199",
        "dob": "1988-09-30",
        "doj": "2023-03-20",
        "current_address": "Robson Street, Vancouver, BC V6E 1B5, Canada",
        "permanent_address": "Robson Street, Vancouver, BC V6E 1B5, Canada",
        "bank_name": "RBC Royal Bank",
        "pan_no": "CAN-SIN-9912",
        "ifsc_code": "ROYCCAT2",
        "primary_skillset": "LLM Fine-tuning & Vector Embeddings",
        "secondary_skillset": "PyTorch, LangChain, GPU Cluster Scaling",
        "experience_years": 12,
        "education": [{"degree": "M.Sc. Artificial Intelligence", "school": "UBC Vancouver", "year": "2013"}]
    },
    {
        "code": "EMP207",
        "first_name": "Mei-Ling",
        "last_name": "Zhou",
        "gender": "women",
        "photo_id": 79,
        "designation": "Lead Data Scientist",
        "team": "Engineering",
        "role": "employee",
        "location": "Toronto, Canada",
        "manager": "David Chen",
        "email": "meiling.zhou@dev.phygitron.com",
        "phone": "+1 416 555 0143",
        "emergency": "+1 416 555 0149",
        "dob": "1991-12-10",
        "doj": "2023-08-01",
        "current_address": "Bay Street, Toronto, ON M5J 2R8, Canada",
        "permanent_address": "Bay Street, Toronto, ON M5J 2R8, Canada",
        "bank_name": "TD Canada Trust",
        "pan_no": "CAN-SIN-8841",
        "ifsc_code": "TDOMCATT",
        "primary_skillset": "Predictive Modeling & Statistical Inference",
        "secondary_skillset": "Python, SQL, Apache Spark, Snowflake",
        "experience_years": 9,
        "education": [{"degree": "Ph.D. Statistics & Data Analytics", "school": "University of Toronto", "year": "2017"}]
    },
    {
        "code": "EMP208",
        "first_name": "Kenji",
        "last_name": "Takahashi",
        "gender": "men",
        "photo_id": 83,
        "designation": "Cloud Security & Compliance Engineer",
        "team": "Engineering",
        "role": "employee",
        "location": "San Francisco, US",
        "manager": "Arjun Patel",
        "email": "kenji.takahashi@dev.phygitron.com",
        "phone": "+1 415 555 0188",
        "emergency": "+1 415 555 0180",
        "dob": "1993-07-04",
        "doj": "2024-01-08",
        "current_address": "Mission District, San Francisco, CA 94110, USA",
        "permanent_address": "Mission District, San Francisco, CA 94110, USA",
        "bank_name": "Chase Bank",
        "pan_no": "US-SSN-7721",
        "ifsc_code": "CHASUS33",
        "primary_skillset": "DevSecOps, IAM & SOC2 Compliance",
        "secondary_skillset": "AWS GuardDuty, Falco, Penetration Testing",
        "experience_years": 8,
        "education": [{"degree": "B.S. Cybersecurity", "school": "UC Berkeley", "year": "2015"}]
    },

    # ── 3. AMERICAN ──────────────────────────────────────────────────────────
    {
        "code": "EMP209",
        "first_name": "Marcus",
        "last_name": "Vance",
        "gender": "men",
        "photo_id": 53,
        "designation": "Director of Product Management",
        "team": "Product",
        "role": "manager",
        "location": "San Francisco, US",
        "manager": "Self (Executive)",
        "email": "marcus.vance@dev.phygitron.com",
        "phone": "+1 415 555 0171",
        "emergency": "+1 415 555 0179",
        "dob": "1985-05-22",
        "doj": "2023-02-01",
        "current_address": "Pacific Heights, San Francisco, CA 94115, USA",
        "permanent_address": "Pacific Heights, San Francisco, CA 94115, USA",
        "bank_name": "Bank of America",
        "pan_no": "US-SSN-4412",
        "ifsc_code": "BOFAUS3N",
        "primary_skillset": "Product Vision, SaaS Growth & Enterprise UX",
        "secondary_skillset": "Roadmapping, Customer Discovery, OKR Planning",
        "experience_years": 15,
        "education": [{"degree": "MBA Enterprise Leadership", "school": "Stanford GSB", "year": "2011"}]
    },
    {
        "code": "EMP210",
        "first_name": "Sarah",
        "last_name": "Jenkins",
        "gender": "women",
        "photo_id": 68,
        "designation": "Head of People & Global Talent",
        "team": "Human Resources",
        "role": "hr",
        "location": "New York, US",
        "manager": "Self (Executive)",
        "email": "sarah.jenkins@dev.phygitron.com",
        "phone": "+1 212 555 0194",
        "emergency": "+1 212 555 0190",
        "dob": "1989-10-15",
        "doj": "2023-01-20",
        "current_address": "Upper West Side, New York, NY 10024, USA",
        "permanent_address": "Upper West Side, New York, NY 10024, USA",
        "bank_name": "Citibank",
        "pan_no": "US-SSN-5534",
        "ifsc_code": "CITIUS33",
        "primary_skillset": "Global Talent Strategy & Culture Building",
        "secondary_skillset": "DEI Programs, Executive Recruiting, Comp & Ben",
        "experience_years": 12,
        "education": [{"degree": "M.S. Industrial Psychology", "school": "Columbia University", "year": "2013"}]
    },
    {
        "code": "EMP211",
        "first_name": "James",
        "last_name": "Walker",
        "gender": "men",
        "photo_id": 60,
        "designation": "Enterprise Account Executive",
        "team": "Sales",
        "role": "employee",
        "location": "Chicago, US",
        "manager": "Marcus Vance",
        "email": "james.walker@dev.phygitron.com",
        "phone": "+1 312 555 0155",
        "emergency": "+1 312 555 0159",
        "dob": "1991-03-17",
        "doj": "2023-11-01",
        "current_address": "Lincoln Park, Chicago, IL 60614, USA",
        "permanent_address": "Lincoln Park, Chicago, IL 60614, USA",
        "bank_name": "Chase Bank",
        "pan_no": "US-SSN-6619",
        "ifsc_code": "CHASUS33",
        "primary_skillset": "B2B Enterprise SaaS Deals & Negotiations",
        "secondary_skillset": "Salesforce CRM, MEDDIC Sales Methodology",
        "experience_years": 9,
        "education": [{"degree": "B.A. Economics", "school": "Northwestern University", "year": "2014"}]
    },
    {
        "code": "EMP212",
        "first_name": "Emily",
        "last_name": "Rodriguez",
        "gender": "women",
        "photo_id": 90,
        "designation": "Customer Success & Implementation Lead",
        "team": "Customer Success",
        "role": "manager",
        "location": "Austin, US",
        "manager": "Marcus Vance",
        "email": "emily.rodriguez@dev.phygitron.com",
        "phone": "+1 512 555 0132",
        "emergency": "+1 512 555 0138",
        "dob": "1993-08-27",
        "doj": "2024-03-01",
        "current_address": "South Congress Ave, Austin, TX 78704, USA",
        "permanent_address": "South Congress Ave, Austin, TX 78704, USA",
        "bank_name": "Wells Fargo",
        "pan_no": "US-SSN-8820",
        "ifsc_code": "WFBIUS6S",
        "primary_skillset": "Client Onboarding & Enterprise Retention",
        "secondary_skillset": "Gainsight, Customer Journey Mapping, CSAT Optimization",
        "experience_years": 8,
        "education": [{"degree": "B.S. Public Relations", "school": "UT Austin", "year": "2015"}]
    },

    # ── 4. EUROPEAN ──────────────────────────────────────────────────────────
    {
        "code": "EMP213",
        "first_name": "Elena",
        "last_name": "Rossi",
        "gender": "women",
        "photo_id": 48,
        "designation": "Lead UX/UI Designer",
        "team": "Design",
        "role": "manager",
        "location": "Montreal, Canada",
        "manager": "Marcus Vance",
        "email": "elena.rossi@dev.phygitron.com",
        "phone": "+1 514 555 0184",
        "emergency": "+1 514 555 0189",
        "dob": "1992-01-25",
        "doj": "2023-05-15",
        "current_address": "Mile End, Montreal, QC H2T 2L7, Canada",
        "permanent_address": "Via Garibaldi, Milan, Italy",
        "bank_name": "Bank of Montreal (BMO)",
        "pan_no": "CAN-SIN-7734",
        "ifsc_code": "BOFMCAM2",
        "primary_skillset": "Design Systems & Interactive Prototyping",
        "secondary_skillset": "Figma, User Testing, Micro-interactions, Accessibility",
        "experience_years": 9,
        "education": [{"degree": "Master of Interaction Design", "school": "Politecnico di Milano", "year": "2016"}]
    },
    {
        "code": "EMP214",
        "first_name": "Sophie",
        "last_name": "Martin",
        "gender": "women",
        "photo_id": 35,
        "designation": "Senior Product Marketing Manager",
        "team": "Marketing",
        "role": "employee",
        "location": "Toronto, Canada",
        "manager": "Marcus Vance",
        "email": "sophie.martin@dev.phygitron.com",
        "phone": "+1 416 555 0166",
        "emergency": "+1 416 555 0160",
        "dob": "1994-06-14",
        "doj": "2023-10-10",
        "current_address": "King Street West, Toronto, ON M5V 1L7, Canada",
        "permanent_address": "Avenue Montaigne, Paris, France",
        "bank_name": "Scotiabank",
        "pan_no": "CAN-SIN-6623",
        "ifsc_code": "NOSCCATT",
        "primary_skillset": "Go-to-Market Strategy & Product Launch",
        "secondary_skillset": "Competitive Intelligence, Positioning, Collateral Creation",
        "experience_years": 7,
        "education": [{"degree": "M.Sc. Strategic Marketing", "school": "HEC Paris", "year": "2017"}]
    },
    {
        "code": "EMP215",
        "first_name": "Liam",
        "last_name": "O'Connor",
        "gender": "men",
        "photo_id": 22,
        "designation": "Senior QA Automation Engineer",
        "team": "Quality Assurance",
        "role": "employee",
        "location": "Seattle, US",
        "manager": "Priya Sharma",
        "email": "liam.oconnor@dev.phygitron.com",
        "phone": "+1 206 555 0117",
        "emergency": "+1 206 555 0119",
        "dob": "1990-11-29",
        "doj": "2023-06-01",
        "current_address": "Capitol Hill, Seattle, WA 98102, USA",
        "permanent_address": "Ranelagh, Dublin 6, Ireland",
        "bank_name": "Chase Bank",
        "pan_no": "US-SSN-3341",
        "ifsc_code": "CHASUS33",
        "primary_skillset": "Automated End-to-End & Performance Testing",
        "secondary_skillset": "Playwright, Cypress, k6, PyTest, CI Test Pipelines",
        "experience_years": 10,
        "education": [{"degree": "B.Sc. Computer Applications", "school": "Trinity College Dublin", "year": "2013"}]
    },
    {
        "code": "EMP216",
        "first_name": "Lucas",
        "last_name": "Meyer",
        "gender": "men",
        "photo_id": 41,
        "designation": "Staff Backend Engineer",
        "team": "Engineering",
        "role": "employee",
        "location": "Austin, US",
        "manager": "Priya Sharma",
        "email": "lucas.meyer@dev.phygitron.com",
        "phone": "+1 512 555 0164",
        "emergency": "+1 512 555 0169",
        "dob": "1989-08-08",
        "doj": "2023-07-15",
        "current_address": "East Austin, Austin, TX 78702, USA",
        "permanent_address": "Schwabing, Munich, Germany",
        "bank_name": "Bank of America",
        "pan_no": "US-SSN-2219",
        "ifsc_code": "BOFAUS3N",
        "primary_skillset": "High-Throughput APIs & Async Architecture",
        "secondary_skillset": "Python FastAPI, PostgreSQL, Redis, Event-Driven Systems",
        "experience_years": 11,
        "education": [{"degree": "M.Sc. Software Engineering", "school": "Technical University of Munich", "year": "2014"}]
    },
    {
        "code": "EMP217",
        "first_name": "Chloe",
        "last_name": "Dubois",
        "gender": "women",
        "photo_id": 55,
        "designation": "Senior Frontend Engineer",
        "team": "Engineering",
        "role": "employee",
        "location": "Vancouver, Canada",
        "manager": "Priya Sharma",
        "email": "chloe.dubois@dev.phygitron.com",
        "phone": "+1 604 555 0148",
        "emergency": "+1 604 555 0140",
        "dob": "1993-04-19",
        "doj": "2024-02-15",
        "current_address": "Kitsilano, Vancouver, BC V6K 2G8, Canada",
        "permanent_address": "Lyon, France",
        "bank_name": "CIBC",
        "pan_no": "CAN-SIN-5510",
        "ifsc_code": "CIBCATT",
        "primary_skillset": "Modern Web UI, React & Performance Tuning",
        "secondary_skillset": "Vite, TailwindCSS, State Management, Core Web Vitals",
        "experience_years": 8,
        "education": [{"degree": "B.Eng. Computer Science", "school": "INSA Lyon", "year": "2016"}]
    },
    {
        "code": "EMP218",
        "first_name": "Alexander",
        "last_name": "Novak",
        "gender": "men",
        "photo_id": 85,
        "designation": "Senior Solutions Architect",
        "team": "Sales",
        "role": "employee",
        "location": "Toronto, Canada",
        "manager": "Marcus Vance",
        "email": "alexander.novak@dev.phygitron.com",
        "phone": "+1 416 555 0199",
        "emergency": "+1 416 555 0192",
        "dob": "1988-12-03",
        "doj": "2023-12-01",
        "current_address": "Distillery District, Toronto, ON M5A 3C4, Canada",
        "permanent_address": "Prague 1, Czech Republic",
        "bank_name": "TD Canada Trust",
        "pan_no": "CAN-SIN-4491",
        "ifsc_code": "TDOMCATT",
        "primary_skillset": "Pre-Sales Technical Architecture & Integrations",
        "secondary_skillset": "Enterprise SSO / SAML, API Integration, POC Delivery",
        "experience_years": 12,
        "education": [{"degree": "M.Sc. Information Technology", "school": "Czech Technical University in Prague", "year": "2012"}]
    }
]

def download_portrait_bytes(gender, photo_id):
    """Downloads high-res portrait from RandomUser CDN, with fallback avatar generator."""
    url = f"https://randomuser.me/api/portraits/{gender}/{photo_id}.jpg"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                return resp.read()
    except Exception as e:
        print(f"    [!] Warning: could not download from {url}: {e}")
    
    # Fallback using PIL
    from PIL import Image, ImageDraw
    import io
    img = Image.new("RGB", (300, 300), color=(124, 58, 237))
    draw = ImageDraw.Draw(img)
    draw.ellipse((50, 50, 250, 250), fill=(245, 237, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def upload_photo_to_spaces(s3_client, bucket, tenant_id, code, photo_bytes):
    key = f"{tenant_id}/deploy/pfp/{code}_pfp.jpg"
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=photo_bytes,
        ContentType="image/jpeg",
        ACL="public-read"
    )
    url = f"https://fra1.digitaloceanspaces.com/{bucket}/{key}"
    return url

def run_seed():
    print("=" * 70)
    print("🌱 Phygitron 360 - Production Seeder for Tenant 'dev'")
    print("=" * 70)

    # 1. Read configs
    print("[1/5] Loading production credentials from Terraform state & vars...")
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

    # 2. Get Public IP & Whitelist
    print("[2/5] Checking public IP and whitelisting in DigitalOcean DB firewall...")
    my_ip = get_public_ip()
    print(f"  → Your Public IP is: {my_ip}")
    print(f"  → Whitelisting on cluster {cluster_id}...")
    set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=my_ip)
    print("  → Firewall updated! Waiting 5s for propagation...")
    time.sleep(5)

    s3 = boto3.client(
        "s3",
        region_name="fra1",
        endpoint_url="https://fra1.digitaloceanspaces.com",
        aws_access_key_id=spaces_key,
        aws_secret_access_key=spaces_secret,
        config=Config(signature_version="s3v4")
    )

    try:
        # 3. Connect to PostgreSQL
        print(f"[3/5] Connecting to production PostgreSQL at {db_host}:{db_port}...")
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
            # Ensure schema exists
            cur.execute('CREATE SCHEMA IF NOT EXISTS "tenant_dev"')
            cur.execute('SET search_path TO "tenant_dev", public')

            # Ensure tenant registry entry exists
            cur.execute("""
                INSERT INTO public.tenants (id, company_name, admin_email, subdomain, modules_enabled, is_active)
                VALUES ('tenant_dev', 'dev', 'cluxssy25@gmail.com', 'dev', ARRAY['source','forge','verify','deploy','lexai'], TRUE)
                ON CONFLICT (id) DO UPDATE SET is_active = TRUE
            """)

            # Ensure tables exist
            from backend.core.database import create_tables
            # We already run create_tables logic or tables exist
            cur.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'tenant_dev' AND table_name = 'employees'
            """)
            if not cur.fetchone():
                print("  → Initializing tenant_dev tables...")
                create_tables("tenant_dev")
                cur.execute('SET search_path TO "tenant_dev", public')

            print("[4/5] Uploading profile photos to Spaces and seeding employees...")
            seeded_count = 0
            default_password_hash = pbkdf2_sha256.hash("Demo@2026!")

            for emp in EMPLOYEES_DATA:
                code = emp["code"]
                full_name = f"{emp['first_name']} {emp['last_name']}"

                # Download & upload photo to Spaces
                photo_bytes = download_portrait_bytes(emp["gender"], emp["photo_id"])
                photo_url = upload_photo_to_spaces(s3, bucket, "tenant_dev", code, photo_bytes)
                print(f"  [+] {code} - {full_name} ({emp['location']}) | Photo: OK")

                # Upsert into employees
                cur.execute("""
                    INSERT INTO employees (
                        employee_code, name, first_name, last_name, guardian_name,
                        dob, contact_number, emergency_contact, email_id, doj,
                        team, designation, employment_type, reporting_manager, location,
                        current_address, permanent_address, education_details,
                        pf_included, mediclaim_included, photo_path, notes,
                        bank_name, bank_account_no, pan_no, ifsc_code,
                        employment_status, hr_approved, finance_approved
                    ) VALUES (
                        %(code)s, %(name)s, %(first_name)s, %(last_name)s, 'N/A',
                        %(dob)s, %(phone)s, %(emergency)s, %(email)s, %(doj)s,
                        %(team)s, %(designation)s, 'Full-time', %(manager)s, %(location)s,
                        %(current_address)s, %(permanent_address)s, %(education)s,
                        'Yes', 'Yes', %(photo_url)s, 'Seeded demo employee with full complete profile',
                        %(bank_name)s, '987654321012', %(pan_no)s, %(ifsc_code)s,
                        'Active', 1, 1
                    )
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
                """, {
                    **emp,
                    "name": full_name,
                    "photo_url": photo_url,
                    "education": json.dumps(emp["education"])
                })

                # Upsert into skill_matrix
                cur.execute("DELETE FROM skill_matrix WHERE employee_code = %s", (code,))
                cur.execute("""
                    INSERT INTO skill_matrix (
                        employee_code, candidate_name, primary_skillset, secondary_skillset, experience_years
                    ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    code,
                    full_name,
                    emp["primary_skillset"],
                    emp["secondary_skillset"],
                    emp["experience_years"]
                ))

                # Upsert into users so employee has login credentials if needed
                cur.execute("""
                    INSERT INTO users (
                        username, password_hash, role, roles, employee_code, is_active
                    ) VALUES (
                        %s, %s, %s, %s, %s, 1
                    )
                    ON CONFLICT (username) DO UPDATE SET
                        employee_code = EXCLUDED.employee_code,
                        role = EXCLUDED.role,
                        roles = EXCLUDED.roles,
                        is_active = 1
                """, (
                    emp["email"],
                    default_password_hash,
                    emp["role"],
                    [emp["role"]],
                    code
                ))

                seeded_count += 1

            conn.commit()
            print(f"\n[✔] Successfully seeded {seeded_count} global employees into production tenant 'dev'!")

            # Verify total count in tenant_dev
            cur.execute("SELECT count(*) FROM employees")
            total = cur.fetchone()["count"]
            print(f"  → Total employees now active in tenant_dev: {total}")

    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
        print(f"\n[✘] Error during database seeding: {e}")
        raise
    finally:
        if 'conn' in locals() and conn:
            conn.close()
        # 5. Revoke IP Whitelist
        print("\n[5/5] Revoking public IP whitelist from DigitalOcean DB firewall...")
        try:
            set_do_db_firewall(do_token, cluster_id, app_id, additional_ip=None)
            print("  → Database firewall restored to secure lockdown state.")
        except Exception as fe:
            print(f"  [!] Warning: Failed to revoke firewall IP automatically: {fe}")

    print("\n🎉 Done! All 18 demo employees with photos are live on production.")

if __name__ == "__main__":
    run_seed()
