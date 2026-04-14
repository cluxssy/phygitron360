DO $$ 
DECLARE 
    schema_rec RECORD;
BEGIN 
    FOR schema_rec IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    LOOP 
        EXECUTE format('ALTER TABLE %I.users DROP CONSTRAINT IF EXISTS users_role_check', schema_rec.schema_name);
        EXECUTE format('UPDATE %I.users SET role=''super_admin'', roles=ARRAY[''super_admin'']::TEXT[] WHERE role IN (''Superadmin'', ''super_admin'')', schema_rec.schema_name);
        EXECUTE format('UPDATE %I.users SET role=''org_admin'', roles=ARRAY[''org_admin'']::TEXT[] WHERE role IN (''Admin'', ''admin'')', schema_rec.schema_name);
    END LOOP;
END $$;
