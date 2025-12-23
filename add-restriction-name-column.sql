-- Add restriction_name column to restrictions_templates_new table
ALTER TABLE restrictions_templates_new
ADD COLUMN IF NOT EXISTS restriction_name VARCHAR(255);

-- Add comment to document the column
COMMENT ON COLUMN restrictions_templates_new.restriction_name IS 'Human-readable name for the restriction (e.g., "Rule 144", "Rule 144A")';
