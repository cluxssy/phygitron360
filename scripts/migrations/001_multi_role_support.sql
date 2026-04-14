-- Multi-Role Support Migration
-- This script safely updates the users table to support multiple roles stored as an array.

DO $$ 
DECLARE 
    schema_rec RECORD;
BEGIN 
    -- Iterate through all schemas to apply the change
    FOR schema_rec IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    LOOP 
        -- 1. Add 'roles' column as TEXT[] if it doesn't exist
        EXECUTE format('ALTER TABLE %I.users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[]', schema_rec.schema_name);
        
        -- 2. Migrate data from 'role' (singular) to 'roles' (array) if 'roles' is still empty
        EXECUTE format('UPDATE %I.users SET roles = ARRAY[role] WHERE cardinality(roles) = 0 AND role IS NOT NULL', schema_rec.schema_name);
        
        -- 3. Update 'role' check constraint or handle legacy column (optional: keep singular role as primary for now)
        -- We will keep 'role' for backward compatibility but prioritize 'roles' in the code.
        
        RAISE NOTICE 'Applied Multi-Role Migration to schema: %', schema_rec.schema_name;
    END LOOP;
END $$;
