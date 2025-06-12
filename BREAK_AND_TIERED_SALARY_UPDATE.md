# Break Deduction and Tiered Salary Implementation

## Summary of Changes

This update implements two major policy changes:

### 1. Automatic Break Deduction (1 Hour)
- **Applies to**: Regular and Work From Home (WFH) log types only
- **Rule**: For shifts longer than 4 hours, automatically deduct 1 hour for lunch break (12pm-1pm)
- **Exempt**: Overtime logs do not get break deductions
- **Implementation**: Updated `calculate_total_hours_trigger()` function

### 2. Tiered Salary Structure
- **Previous**: Fixed ₱200 per regular working day
- **New Structure**:
  - ₱200 for 8+ hours per day
  - ₱100 for 4-7.99 hours per day  
  - ₱0 for less than 4 hours per day
- **Calculation**: Based on daily regular hours only (excludes overtime/WFH)
- **Implementation**: Updated `get_monthly_log_breakdown()` function

## Database Changes

### Files Modified:
- `DATABASE_MIGRATION_SCRIPT_UPDATED.sql` - Complete migration script with new logic
- Original `DATABASE_MIGRATION_SCRIPT.sql` - Previous version (keep for reference)

### Functions Updated:
1. `calculate_total_hours_trigger()` - Now deducts break time
2. `get_monthly_log_breakdown()` - Implements tiered salary calculation
3. `refresh_monthly_salary_history()` - Uses new salary logic
4. `recalculate_all_salary_history()` - Recalculates all historical records

## Frontend Changes

### Components Updated:
- `UserStatusLog.tsx` - Updated salary display and CSV headers
- `MonthlySalaryHistory.tsx` - Updated description to show new policy

### UI Changes:
- Salary display now shows "₱200 for 8+ hrs, ₱100 for 4-7.99 hrs/day"
- CSV exports include updated salary policy information
- Clear indication that overtime/WFH are excluded from salary

## Deployment Instructions

1. **Run the new migration script** in Supabase SQL Editor:
   ```sql
   -- Run DATABASE_MIGRATION_SCRIPT_UPDATED.sql
   ```

2. **Verify the changes**:
   - Check that existing time logs have updated total_hours (with break deduction)
   - Verify monthly_salary_history reflects new tiered calculations
   - Test new time entries to ensure break deduction works

3. **Frontend is ready** - All components have been updated to reflect the new policies

## Policy Summary

| Log Type | Break Deduction | Salary Contribution |
|----------|-----------------|-------------------|
| Regular | 1 hour (if shift > 4 hrs) | ₱200 (8+ hrs) / ₱100 (4-7.99 hrs) |
| WFH | 1 hour (if shift > 4 hrs) | ₱0 (excluded from salary) |
| Overtime | No break deduction | ₱0 (excluded from salary) |

The system now automatically handles break deductions and calculates salaries using the new tiered structure, ensuring fair compensation based on actual working hours while maintaining clear policy boundaries.
