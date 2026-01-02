-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- This table stores in-app notifications for users
-- Used for notifying admins when brokers submit transfer requests

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Notification content
  type TEXT NOT NULL, -- 'broker_request_submitted', 'request_status_changed', 'request_assigned', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entity (for linking back to the source)
  entity_type TEXT, -- 'transfer_request', 'document', etc.
  entity_id UUID,
  
  -- Action link (where to navigate when clicked)
  action_url TEXT,
  
  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for fetching user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notifications(user_id);

-- Index for fetching unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_notifications_created 
ON notifications(created_at DESC);

-- Index for entity lookups (e.g., find all notifications for a specific request)
CREATE INDEX IF NOT EXISTS idx_notifications_entity 
ON notifications(entity_type, entity_id);

-- ============================================================================
-- NOTE: RLS (Row Level Security) has been disabled for easier testing
-- The notification service will handle security at the application level
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Clean up old read notifications
-- ============================================================================
-- Optional: Function to delete read notifications older than 30 days
-- This keeps the table size manageable
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
  AND read_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: You can set up a cron job to run this periodically
-- For now, it can be run manually or via a scheduled job

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this migration, verify with:
-- SELECT COUNT(*) FROM notifications;
-- SELECT * FROM pg_indexes WHERE tablename = 'notifications';
