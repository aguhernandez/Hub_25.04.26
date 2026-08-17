/*
  # Update Admin Communications Status Values

  1. Changes
    - Add 'not_configured' as valid status value for admin_communications_log
    - This allows tracking when email sending failed due to missing Brevo API key
  
  2. Existing Status Values
    - sent: Successfully sent
    - failed: Failed to send  
    - pending: Queued but not yet sent
    - not_configured: Service not configured (e.g., missing API key)
*/

-- Drop existing constraint
ALTER TABLE admin_communications_log 
DROP CONSTRAINT IF EXISTS admin_communications_log_status_check;

-- Add new constraint with additional status value
ALTER TABLE admin_communications_log 
ADD CONSTRAINT admin_communications_log_status_check 
CHECK (status IN ('sent', 'failed', 'pending', 'not_configured'));