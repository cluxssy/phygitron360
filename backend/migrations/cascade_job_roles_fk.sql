-- Migration: Enforce ON DELETE CASCADE on ai_scores and candidate_invites referencing job_roles
-- Prevents foreign key constraint violations during job role deletion and bulk deletion.

DO $$
DECLARE
    schema_rec RECORD;
BEGIN
    FOR schema_rec IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    LOOP
        -- ai_scores.job_role_id -> job_roles.id ON DELETE CASCADE
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'ai_scores_job_role_id_fkey' 
              AND table_schema = schema_rec.schema_name
        ) THEN
            EXECUTE format('ALTER TABLE %I.ai_scores DROP CONSTRAINT ai_scores_job_role_id_fkey', schema_rec.schema_name);
            EXECUTE format('ALTER TABLE %I.ai_scores ADD CONSTRAINT ai_scores_job_role_id_fkey FOREIGN KEY (job_role_id) REFERENCES %I.job_roles(id) ON DELETE CASCADE', schema_rec.schema_name, schema_rec.schema_name);
        END IF;

        -- candidate_invites.job_role_id -> job_roles.id ON DELETE CASCADE
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'candidate_invites_job_role_id_fkey' 
              AND table_schema = schema_rec.schema_name
        ) THEN
            EXECUTE format('ALTER TABLE %I.candidate_invites DROP CONSTRAINT candidate_invites_job_role_id_fkey', schema_rec.schema_name);
            EXECUTE format('ALTER TABLE %I.candidate_invites ADD CONSTRAINT candidate_invites_job_role_id_fkey FOREIGN KEY (job_role_id) REFERENCES %I.job_roles(id) ON DELETE CASCADE', schema_rec.schema_name, schema_rec.schema_name);
        END IF;
    END LOOP;
END $$;
