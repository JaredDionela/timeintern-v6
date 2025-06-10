# QR Code Expiration System Setup Instructions

## Step 1: Clean Up Existing System (if applicable)

If you previously ran QR code functions, first run the cleanup script in your Supabase SQL Editor:

```sql
-- Run this in Supabase SQL Editor first
-- Copy and paste the contents of cleanup_qr_system.sql
```

## Step 2: Apply New Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `qr_code_expiration_update.sql`
4. Click "Run" to execute the script

## Step 3: Verify Setup

After running the script, you should see:

1. `qr_codes` table with proper columns
2. Three new RPC functions:
   - `create_qr_code(TEXT, INTEGER)`
   - `validate_qr_code(TEXT)`
   - `use_qr_code(TEXT)`
3. Proper RLS policies
4. Automatic cleanup trigger

## Step 4: Test the Application

1. Start your development server: `npm run dev`
2. Log in as an admin to generate QR codes
3. Log in as an intern to scan QR codes
4. Verify that:
   - QR codes expire after 5 seconds
   - Used QR codes cannot be scanned again
   - Scanner reinitializes properly after each scan

## Features

- **5-second expiration**: QR codes automatically expire and are cleaned up
- **One-time use**: Each QR code can only be used once
- **Database tracking**: All QR codes are tracked in the database
- **Fallback validation**: If database fails, client-side timestamp validation is used
- **Automatic cleanup**: Expired codes are automatically removed

## Troubleshooting

If you encounter issues:

1. Check the browser console for error messages
2. Verify Supabase connection and RLS policies
3. Ensure all database functions were created successfully
4. Test QR scanner on different devices (mobile/desktop)

## Key Improvements

✅ QR codes expire after exactly 5 seconds
✅ Prevention of QR code reuse
✅ Enhanced scanner reinitialization
✅ Database-backed expiration system
✅ Fallback to timestamp validation
✅ Automatic cleanup of expired codes
✅ Better error handling and user feedback
