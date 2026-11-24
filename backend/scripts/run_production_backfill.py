#!/usr/bin/env python3
"""
Production Embeddings Backfill Runner.
Connects directly to the DigitalOcean PostgreSQL database and uses the
multi-key Gemini pool from terraform.tfvars.

Usage:
    python backend/scripts/run_production_backfill.py --tenant tenant_dev --limit 100 --concurrency 3
    python backend/scripts/run_production_backfill.py --tenant tenant_ewandz --limit 500 --concurrency 3
"""

import os
import sys
import json
import argparse

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, BASE_DIR)

# 1. Load DO production credentials from terraform.tfstate
tfstate_path = os.path.join(BASE_DIR, "infra/terraform-do/terraform.tfstate")
if not os.path.exists(tfstate_path):
    print("Error: terraform.tfstate not found.")
    sys.exit(1)

with open(tfstate_path) as f:
    state = json.load(f)

db_attrs = None
for res in state.get("resources", []):
    if res.get("type") == "digitalocean_database_cluster" and res.get("name") == "postgres":
        db_attrs = res.get("instances", [{}])[0].get("attributes", {})
        break

if not db_attrs:
    print("Error: Could not find postgres resource in terraform.tfstate.")
    sys.exit(1)

os.environ["DB_HOST"] = db_attrs.get("host")
os.environ["DB_PORT"] = str(db_attrs.get("port"))
os.environ["DB_NAME"] = db_attrs.get("database")
os.environ["DB_USER"] = db_attrs.get("user")
os.environ["DB_PASSWORD"] = db_attrs.get("password")

# 2. Load gemini_api_keys from terraform.tfvars
tfvars_path = os.path.join(BASE_DIR, "infra/terraform-do/terraform.tfvars")
if os.path.exists(tfvars_path):
    with open(tfvars_path) as f:
        for line in f:
            if line.strip().startswith("gemini_api_keys"):
                keys_val = line.split("=", 1)[1].strip().strip('"')
                os.environ["GEMINI_API_KEYS"] = keys_val
                break

# 3. Now import backfill logic with the production environment active
from backend.scripts.backfill_candidate_embeddings import backfill_tenant

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run embeddings backfill directly on DigitalOcean production")
    parser.add_argument("--tenant", type=str, default="tenant_dev", help="Tenant schema name (e.g. tenant_dev, tenant_ewandz)")
    parser.add_argument("--limit", type=int, default=100, help="Number of candidates to embed")
    parser.add_argument("--delay", type=float, default=0.1, help="Delay per candidate")
    parser.add_argument("--concurrency", type=int, default=3, help="Concurrent workers")
    args = parser.parse_args()

    print(f"Connecting to DigitalOcean production database: {os.environ['DB_HOST']}...")
    backfill_tenant(tenant_id=args.tenant, limit=args.limit, delay_sec=args.delay, concurrency=args.concurrency)
