-- Database Functions Setup

-- If you're seeing errors about missing functions in your application,
-- run these SQL commands in your Supabase SQL editor to create them.

-- This function returns the PostgreSQL version (useful for connectivity checks)
CREATE OR REPLACE FUNCTION public.version()
RETURNS text AS $$
BEGIN
  RETURN current_setting('server_version');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the anon role (for unauthenticated requests)
GRANT EXECUTE ON FUNCTION public.version() TO anon;

-- Grant access to the authenticated role (for authenticated requests)
GRANT EXECUTE ON FUNCTION public.version() TO authenticated;

-- Grant access to the service_role (for server-side requests)
GRANT EXECUTE ON FUNCTION public.version() TO service_role;

-- Add a comment to help identify the function's purpose
COMMENT ON FUNCTION public.version IS 'Returns the PostgreSQL server version for connection testing';

-- Optional: Create a health check function that tests more aspects of your database
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'timestamp', now(),
      'database', current_database(),
      'version', current_setting('server_version'),
      'extensions', (SELECT jsonb_agg(extname) FROM pg_extension),
      'schemas', (SELECT jsonb_agg(schema_name) FROM information_schema.schemata 
                  WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'),
      'status', 'healthy'
    ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the roles
GRANT EXECUTE ON FUNCTION public.health_check() TO anon;
GRANT EXECUTE ON FUNCTION public.health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.health_check() TO service_role;

COMMENT ON FUNCTION public.health_check IS 'Returns database health information for monitoring and connection testing';