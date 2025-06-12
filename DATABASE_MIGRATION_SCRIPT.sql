-- =============================================================================
-- REVERT TO SIMPLE FORMAT - REMOVE BREAK AND OVERTIME COLUMNS
-- This script removes all break/overtime columns and reverts to simple format:
-- Date, Intern, Time In, Time Out, Total Hours, Log Type
-- =============================================================================

-- 1. DROP THE COMPLEX BREAK/OVERTIME COLUMNS
ALTER TABLE time_logs DROP COLUMN IF EXISTS break_out_time;
ALTER TABLE time_logs DROP COLUMN IF EXISTS break_in_time;
ALTER TABLE time_logs DROP COLUMN IF EXISTS ot_in_time;
ALTER TABLE time_logs DROP COLUMN IF EXISTS ot_out_time;
ALTER TABLE time_logs DROP COLUMN IF EXISTS break_duration_minutes;
ALTER TABLE time_logs DROP COLUMN IF EXISTS ot_duration_minutes;

-- 2. REVERT TO SIMPLE TOTAL HOURS CALCULATION
CREATE OR REPLACE FUNCTION calculate_total_hours_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple calculation: only time_in and time_out
    IF NEW.time_in IS NOT NULL AND NEW.time_out IS NOT NULL THEN
        NEW.total_hours := EXTRACT(EPOCH FROM (NEW.time_out::time - NEW.time_in::time)) / 3600.0;
        
        -- Handle overnight shifts (when time_out is next day)
        IF NEW.total_hours < 0 THEN
            NEW.total_hours := NEW.total_hours + 24;
        END IF;
        
        -- Ensure total_hours is not negative and reasonable (max 24 hours)
        IF NEW.total_hours < 0 THEN
            NEW.total_hours := 0;
        ELSIF NEW.total_hours > 24 THEN
            NEW.total_hours := 24;
        END IF;
    ELSE
        NEW.total_hours := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RECREATE THE TRIGGER
DROP TRIGGER IF EXISTS calculate_total_hours_trigger ON time_logs;
CREATE TRIGGER calculate_total_hours_trigger
    BEFORE INSERT OR UPDATE ON time_logs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_hours_trigger();

-- 4. UPDATE EXISTING RECORDS TO RECALCULATE TOTAL HOURS
UPDATE time_logs 
SET total_hours = CASE 
    WHEN time_in IS NOT NULL AND time_out IS NOT NULL THEN
        CASE 
            WHEN EXTRACT(EPOCH FROM (time_out::time - time_in::time)) / 3600.0 < 0 THEN
                EXTRACT(EPOCH FROM (time_out::time - time_in::time)) / 3600.0 + 24
            ELSE
                EXTRACT(EPOCH FROM (time_out::time - time_in::time)) / 3600.0
        END
    ELSE 0
END
WHERE time_in IS NOT NULL AND time_out IS NOT NULL;

-- 5. REMOVE COMPLEX SALARY CALCULATION FUNCTIONS (keep simple ones)
DROP FUNCTION IF EXISTS get_monthly_log_breakdown(uuid, integer, integer);
DROP FUNCTION IF EXISTS calculate_fixed_daily_salary(uuid, integer, integer);
DROP FUNCTION IF EXISTS refresh_monthly_salary_history(uuid, integer, integer);

-- 6. CREATE LOG TYPE-BASED SALARY CALCULATION FUNCTION
-- This function excludes overtime and WFH logs from salary calculation
CREATE OR REPLACE FUNCTION get_monthly_log_breakdown(p_user_id uuid, p_month integer, p_year integer)
RETURNS JSON AS $$
DECLARE
    result JSON;
    regular_hours numeric := 0;
    overtime_hours numeric := 0;
    wfh_hours numeric := 0;
    total_hours numeric := 0;
    days_worked integer := 0;
    regular_days integer := 0;
    calculated_salary numeric := 0;
BEGIN
    -- Calculate regular hours (only from 'regular' or NULL log types)
    SELECT COALESCE(SUM(tl.total_hours), 0)
    INTO regular_hours
    FROM time_logs tl
    WHERE tl.user_id = p_user_id
        AND EXTRACT(MONTH FROM tl.date) = p_month
        AND EXTRACT(YEAR FROM tl.date) = p_year
        AND tl.time_in IS NOT NULL
        AND tl.time_out IS NOT NULL
        AND (tl.log_type IS NULL OR tl.log_type = 'regular');

    -- Calculate overtime hours
    SELECT COALESCE(SUM(tl.total_hours), 0)
    INTO overtime_hours
    FROM time_logs tl
    WHERE tl.user_id = p_user_id
        AND EXTRACT(MONTH FROM tl.date) = p_month
        AND EXTRACT(YEAR FROM tl.date) = p_year
        AND tl.time_in IS NOT NULL
        AND tl.time_out IS NOT NULL
        AND tl.log_type = 'overtime';

    -- Calculate WFH hours
    SELECT COALESCE(SUM(tl.total_hours), 0)
    INTO wfh_hours
    FROM time_logs tl
    WHERE tl.user_id = p_user_id
        AND EXTRACT(MONTH FROM tl.date) = p_month
        AND EXTRACT(YEAR FROM tl.date) = p_year
        AND tl.time_in IS NOT NULL
        AND tl.time_out IS NOT NULL
        AND tl.log_type = 'wfh';

    -- Calculate total hours (all log types)
    total_hours := regular_hours + overtime_hours + wfh_hours;

    -- Count total days worked (any log type)
    SELECT COUNT(DISTINCT tl.date)
    INTO days_worked
    FROM time_logs tl
    WHERE tl.user_id = p_user_id
        AND EXTRACT(MONTH FROM tl.date) = p_month
        AND EXTRACT(YEAR FROM tl.date) = p_year
        AND tl.time_in IS NOT NULL
        AND tl.time_out IS NOT NULL;

    -- Count regular working days (only regular log types for salary calculation)
    SELECT COUNT(DISTINCT tl.date)
    INTO regular_days
    FROM time_logs tl
    WHERE tl.user_id = p_user_id
        AND EXTRACT(MONTH FROM tl.date) = p_month
        AND EXTRACT(YEAR FROM tl.date) = p_year
        AND tl.time_in IS NOT NULL
        AND tl.time_out IS NOT NULL
        AND (tl.log_type IS NULL OR tl.log_type = 'regular');

    -- Calculate salary based ONLY on regular working days (₱200 per day)
    -- Overtime and WFH days do NOT contribute to salary
    calculated_salary := regular_days * 200;

    -- Build the result JSON
    result := json_build_object(
        'total_hours', total_hours,
        'regular_hours', regular_hours,
        'overtime_hours', overtime_hours,
        'wfh_hours', wfh_hours,
        'days_worked', days_worked,
        'regular_days', regular_days,
        'calculated_salary', calculated_salary,
        'daily_rate', 200,
        'salary_policy', 'Fixed ₱200 per regular working day (excludes overtime/WFH)'
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. DROP EXISTING MONTHLY SALARY HISTORY FUNCTION IF EXISTS
DROP FUNCTION IF EXISTS refresh_monthly_salary_history(uuid, integer, integer);

-- 8. CREATE MONTHLY SALARY HISTORY UPDATE FUNCTION
-- This function updates the monthly_salary_history table with correct salary calculation
CREATE OR REPLACE FUNCTION refresh_monthly_salary_history(p_user_id uuid, p_month integer, p_year integer)
RETURNS JSON AS $$
DECLARE
    breakdown_result JSON;
    total_hours_val numeric;
    calculated_salary_val numeric;
BEGIN
    -- Get the breakdown which excludes overtime/WFH from salary
    SELECT get_monthly_log_breakdown(p_user_id, p_month, p_year) INTO breakdown_result;
    
    -- Extract values from the breakdown
    total_hours_val := (breakdown_result->>'total_hours')::numeric;
    calculated_salary_val := (breakdown_result->>'calculated_salary')::numeric;
    
    -- Insert or update monthly salary history
    INSERT INTO monthly_salary_history (user_id, month, year, total_hours, total_salary)
    VALUES (p_user_id, p_month, p_year, total_hours_val, calculated_salary_val)
    ON CONFLICT (user_id, month, year) 
    DO UPDATE SET
        total_hours = EXCLUDED.total_hours,
        total_salary = EXCLUDED.total_salary,
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'month', p_month,
        'year', p_year,
        'total_hours', total_hours_val,
        'total_salary', calculated_salary_val
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREATE TRIGGER FUNCTION TO AUTO-UPDATE MONTHLY SALARY HISTORY
-- This ensures monthly_salary_history stays in sync when time_logs change
CREATE OR REPLACE FUNCTION update_monthly_salary_history_trigger()
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id uuid;
    affected_month integer;
    affected_year integer;
BEGIN
    -- Determine which user/month/year to update
    IF TG_OP = 'DELETE' THEN
        affected_user_id := OLD.user_id;
        affected_month := EXTRACT(MONTH FROM OLD.date);
        affected_year := EXTRACT(YEAR FROM OLD.date);
    ELSE
        affected_user_id := NEW.user_id;
        affected_month := EXTRACT(MONTH FROM NEW.date);
        affected_year := EXTRACT(YEAR FROM NEW.date);
    END IF;
    
    -- Update the monthly salary history
    PERFORM refresh_monthly_salary_history(affected_user_id, affected_month, affected_year);
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE THE TRIGGER
DROP TRIGGER IF EXISTS update_monthly_salary_history_trigger ON time_logs;
CREATE TRIGGER update_monthly_salary_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON time_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_salary_history_trigger();

-- 10. RECALCULATE ALL EXISTING MONTHLY SALARY HISTORY
-- This ensures existing data follows the new salary policy
CREATE OR REPLACE FUNCTION recalculate_all_salary_history()
RETURNS JSON AS $$
DECLARE
    log_record RECORD;
    processed_count integer := 0;
BEGIN
    -- Get all unique user/month/year combinations from time_logs
    FOR log_record IN
        SELECT DISTINCT 
            user_id,
            EXTRACT(MONTH FROM date)::integer as month,
            EXTRACT(YEAR FROM date)::integer as year
        FROM time_logs
        WHERE time_in IS NOT NULL AND time_out IS NOT NULL
        ORDER BY year DESC, month DESC, user_id
    LOOP
        -- Refresh the monthly salary history for each combination
        PERFORM refresh_monthly_salary_history(
            log_record.user_id, 
            log_record.month, 
            log_record.year
        );
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'All monthly salary history recalculated',
        'processed_records', processed_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION get_monthly_log_breakdown(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_monthly_salary_history(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_salary_history() TO authenticated;
GRANT ALL ON TABLE time_logs TO authenticated;

-- 12. RUN THE RECALCULATION
SELECT recalculate_all_salary_history();

-- 13. VERIFICATION QUERY
SELECT 'Database successfully updated with log-type-based salary calculation' as status,
       'Regular logs: ₱200/day | Overtime/WFH logs: ₱0/day' as policy;
