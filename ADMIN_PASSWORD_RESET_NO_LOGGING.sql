-- ADMIN PASSWORD RESET - NO LOGGING VERSION
-- This function handles admin password resets WITHOUT creating entries in time_logs
-- This prevents confusion in daily logs and keeps password resets separate from time tracking

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_reset_intern_password(uuid, text, uuid);

-- Create the function that does NOT log to time_logs
CREATE OR REPLACE FUNCTION admin_reset_intern_password(
    admin_user_id uuid,
    new_password text,
    intern_user_id uuid
)
RETURNS json 
LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER
AS $$
DECLARE
    admin_email text;
    admin_name text := 'Admin User';
    intern_profile RECORD;
BEGIN
    -- Get admin email and check if user is admin (email contains 'admin')
    SELECT email INTO admin_email
    FROM auth.users
    WHERE id = admin_user_id;
    
    IF admin_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Admin user not found in auth.users.');
    END IF;
    
    IF admin_email NOT LIKE '%admin%' THEN
        RETURN json_build_object('success', false, 'error', 'Access denied. Admin privileges required.');
    END IF;
    
    -- Try to get admin name from intern_profiles if they have one, otherwise use email
    SELECT name INTO admin_name
    FROM intern_profiles
    WHERE user_id = admin_user_id;
    
    IF admin_name IS NULL THEN
        admin_name := admin_email;
    END IF;
    
    -- Get the intern's details using intern_user_id directly
    SELECT * INTO intern_profile
    FROM intern_profiles
    WHERE user_id = intern_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Intern not found.');
    END IF;
    
    -- Validate password requirements
    IF LENGTH(new_password) < 6 THEN
        RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;
    
    -- NOTE: NO LOGGING TO time_logs TABLE
    -- Password resets should not appear in daily time tracking logs
    -- This keeps the audit trail clean and prevents confusion
    
    -- Return success with instructions for frontend password update
    RETURN json_build_object(
        'success', true, 
        'message', 'Password reset authorized. No log entry created.',
        'intern_user_id', intern_user_id,
        'intern_email', intern_profile.email,
        'intern_name', intern_profile.name,
        'admin_name', admin_name,
        'admin_email', admin_email
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_reset_intern_password(uuid, text, uuid) TO authenticated;

-- Test the function (replace with actual UUIDs in production)
-- SELECT admin_reset_intern_password(
--     'admin-user-uuid-here',
--     'test123456',
--     'intern-user-uuid-here'
-- );

-- Verification query
SELECT 'Admin password reset function updated - NO LOGGING VERSION' as status,
       'Function: admin_reset_intern_password(admin_user_id, new_password, intern_user_id)' as function_signature,
       'Key change: Removed INSERT INTO time_logs - password resets will not appear in daily logs' as improvement;
