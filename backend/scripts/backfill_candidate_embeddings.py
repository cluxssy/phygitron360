#!/usr/bin/env python3
"""
Backfill script to generate and store 768-dim vector embeddings for existing candidates.
Usage:
    python backend/scripts/backfill_candidate_embeddings.py --tenant tenant_dev --limit 100
"""

import sys
import os
import time
import argparse
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.core.database import get_db_connection
from backend.common.services.ai.base import _get_gemini_key_list
from backend.modules.source.services.candidate_embedding_service import embed_and_save_candidate

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill_embeddings")


def backfill_tenant(tenant_id: str, limit: int = 100, delay_sec: float = 0.1, concurrency: int = 3):
    keys = _get_gemini_key_list()
    logger.info(f"Loaded {len(keys)} Gemini API key(s) in pool.")

    conn = get_db_connection()
    candidate_ids = []
    try:
        with conn.cursor() as cur:
            cur.execute(f'SET search_path TO "{tenant_id}", public;')
            cur.execute(
                """
                SELECT id FROM candidates 
                WHERE embedding IS NULL 
                ORDER BY id ASC 
                LIMIT %s;
                """,
                (limit,)
            )
            candidate_ids = [r[0] for r in cur.fetchall()]
    finally:
        conn.close()

    total = len(candidate_ids)
    logger.info(f"[{tenant_id}] Found {total} candidate(s) requiring embedding backfill.")
    if total == 0:
        return

    success_count = 0
    fail_count = 0

    def process_candidate(cid):
        if delay_sec > 0:
            time.sleep(delay_sec)
        try:
            ok = embed_and_save_candidate(cid, tenant_id=tenant_id)
            return cid, ok, None
        except Exception as e:
            return cid, False, e

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = {executor.submit(process_candidate, cid): cid for cid in candidate_ids}
        completed = 0
        consecutive_fails = 0
        for future in as_completed(futures):
            completed += 1
            cid, ok, err = future.result()
            if ok:
                success_count += 1
                consecutive_fails = 0
                logger.info(f"[{completed}/{total}] Successfully embedded candidate ID {cid}")
            else:
                fail_count += 1
                consecutive_fails += 1
                msg = f": {err}" if err else ""
                logger.warning(f"[{completed}/{total}] Skipped / failed candidate ID {cid}{msg}")

            if consecutive_fails >= max(len(keys) * 3, 6):
                logger.error("Multiple consecutive failures detected — Gemini API keys in pool may be rate-limited.")
                break

    logger.info(
        f"[{tenant_id}] Backfill complete: {success_count} succeeded, {fail_count} failed out of {total}."
    )


def main():
    parser = argparse.ArgumentParser(description="Backfill candidate embeddings for semantic search")
    parser.add_argument("--tenant", type=str, default="tenant_dev", help="Tenant schema name (e.g. tenant_dev)")
    parser.add_argument("--limit", type=int, default=20, help="Maximum number of candidates to process in this run")
    parser.add_argument("--delay", type=float, default=0.1, help="Delay between API calls in seconds")
    parser.add_argument("--concurrency", type=int, default=3, help="Concurrent workers")
    args = parser.parse_args()

    backfill_tenant(tenant_id=args.tenant, limit=args.limit, delay_sec=args.delay, concurrency=args.concurrency)


if __name__ == "__main__":
    main()
