# WFH SALARY EXCLUSION FIX - CORRECTED POLICY

## Issue Fixed
The system was incorrectly including Work From Home (WFH) hours in salary calculations. According to requirements, only regular hours should contribute to salary, while both overtime and WFH should be tracked but excluded from salary calculation.

## Corrected Salary Policy

### What Contributes to Salary:
- **ONLY Regular log types** (including NULL log types which default to regular)
- Tiered structure:
  - ₱200 for 8+ hours per day
  - ₱100 for 4-7.99 hours per day
  - ₱0 for < 4 hours per day

### What Does NOT Contribute to Salary:
- **Overtime hours** (tracked but ₱0 salary contribution)
- **Work From Home (WFH) hours** (tracked but ₱0 salary contribution)

### Break Policy (Unchanged):
- 1-hour break automatically deducted for regular and WFH shifts > 4 hours
- No break deduction for overtime shifts
- Break hours are not recorded separately (automatically calculated)

## Files Updated

### Database Migration Script:
- `DATABASE_MIGRATION_SCRIPT_FIXED.sql` - Corrected salary calculation logic
  - Removed WFH from salary calculation in `get_monthly_log_breakdown` function
  - Updated comments and policy descriptions
  - Fixed daily_regular_hours CTE to exclude WFH from salary

### Frontend Components:
- `MonthlySalaryHistory.tsx` - Updated description to clarify WFH/Overtime exclusion

## Implementation Steps

1. **Run the corrected database migration script** in Supabase SQL Editor:
   ```sql
   -- Execute: DATABASE_MIGRATION_SCRIPT_FIXED.sql
   ```

2. **The script will automatically:**
   - Drop and recreate the salary calculation functions
   - Recalculate all existing monthly salary history
   - Update triggers to use the corrected logic

3. **Verification:**
   - Check that WFH hours are tracked in the system
   - Confirm WFH hours do NOT contribute to salary calculations
   - Verify only regular hours affect monthly salary totals

## Expected Behavior After Fix

### Before Fix (Incorrect):
- Regular hours: ✅ Contribute to salary
- WFH hours: ❌ Incorrectly contributed to salary  
- Overtime hours: ✅ Correctly excluded from salary

### After Fix (Correct):
- Regular hours: ✅ Contribute to salary
- WFH hours: ✅ Correctly excluded from salary
- Overtime hours: ✅ Correctly excluded from salary

## Testing Checklist

- [ ] Run `DATABASE_MIGRATION_SCRIPT_FIXED.sql` in Supabase
- [ ] Create test logs with different log types (regular, WFH, overtime)
- [ ] Verify only regular hours contribute to monthly salary
- [ ] Check UserStatusLog shows correct salary calculations
- [ ] Confirm MonthlySalaryHistory reflects accurate totals
- [ ] Test that break deduction still works for regular and WFH shifts

The fix ensures that Work From Home hours are properly tracked for time management but correctly excluded from salary calculations, matching the intended business logic.
