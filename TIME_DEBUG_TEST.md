# Time Debugging Test

## Steps to Debug Time Issue

1. **Scan QR Code at 11:41 PM**
2. **Check Browser Console for Debug Output**

You should see console logs showing:
- QR Scanner Time In/Out Debug: Shows the actual time being captured
- InternDashboard fetchTodayStatus Debug: Shows what's retrieved from database
- formatLocalTime Debug: Shows input and output of time formatting

## Expected vs Actual

**Expected when scanning at 11:41 PM:**
- hours: 23
- minutes: 41
- timeInStr: "23:41"
- timeInTimestamp: "2025-06-12 23:41:00"
- formatted display: "23:41"

**If you see different values, that indicates where the bug is occurring.**

## Common Issues to Look For

1. **AM/PM Confusion**: If hours shows 11 instead of 23
2. **Timezone Conversion**: If time is being converted to UTC
3. **String Parsing Error**: If timestamp format is incorrect
4. **Database Storage Issue**: If stored time differs from created time

## After Testing

Once you identify the issue from console logs, we can fix the specific problem area.
