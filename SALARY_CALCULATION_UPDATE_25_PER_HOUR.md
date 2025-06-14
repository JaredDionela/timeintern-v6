# SALARY CALCULATION UPDATE - ₱25/HOUR STRUCTURE

## Summary of Changes

This update implements the new salary calculation logic requested:

### Salary Structure:
- **₱25/hour** for regular hours up to 8 hours per day
- **Unpaid** for hours over 8 hours per day
- Examples:
  - 7.25 hours = ₱181.25 (7.25 × ₱25)
  - 8.0 hours = ₱200 (8.0 × ₱25)
  - 9.5 hours = ₱200 (capped at 8 hours × ₱25)

### Previous Structure (Replaced):
- ₱200 for 8+ hours per day
- ₱100 for 4-7.99 hours per day
- ₱0 for < 4 hours per day

### Rules:
- **Break Policy**: 1-hour break automatically deducted for regular and WFH shifts ≥ 5 hours
- **Salary Contributors**: Only regular hours contribute to salary
- **Excluded from Salary**: Overtime and WFH hours are tracked but excluded from salary calculation

## Files Updated

### 1. Database Migration Script:
- `DATABASE_MIGRATION_SCRIPT_CORRECTED.sql` - Updated salary calculation logic in `get_monthly_log_breakdown()` function

### 2. Frontend Components:
- `MonthlySalaryHistory.tsx` - Updated description to show new ₱25/hour policy
- `UserStatusLog.tsx` - Updated CSV export policy information and function comments

## Updated Database Logic

The `get_monthly_log_breakdown()` function now calculates daily salary as:

```sql
CASE 
    WHEN day_hours <= 8 THEN day_hours * 25  -- ₱25/hour for hours up to 8
    ELSE 8 * 25                              -- Cap at 8 hours * ₱25 = ₱200
END as daily_salary
```

## Policy Summary

| Aspect | Policy |
|--------|--------|
| Hourly Rate | ₱25/hour for regular hours |
| Daily Cap | 8 hours maximum (₱200/day) |
| Break Deduction | 1 hour for shifts ≥ 5 hours |
| Salary Contributors | Regular logs only |
| Excluded | WFH and Overtime logs |

## Deployment Instructions

1. **Run the updated database migration script** in Supabase SQL Editor:
   ```sql
   -- Execute: DATABASE_MIGRATION_SCRIPT_CORRECTED.sql
   ```

2. **The script will automatically:**
   - Update the salary calculation logic
   - Recalculate all existing monthly salary history
   - Apply the new ₱25/hour structure

3. **Frontend is ready** - All components reflect the new policy

## Examples of Salary Calculation

| Daily Hours | Calculation | Daily Salary |
|-------------|-------------|--------------|
| 3.5 hours | 3.5 × ₱25 | ₱87.50 |
| 5.0 hours | 5.0 × ₱25 | ₱125.00 |
| 7.25 hours | 7.25 × ₱25 | ₱181.25 |
| 8.0 hours | 8.0 × ₱25 | ₱200.00 |
| 9.5 hours | 8.0 × ₱25 (capped) | ₱200.00 |

The updated system provides more granular and fair compensation based on actual hours worked, while maintaining the 8-hour daily maximum policy.
