-- Delete all shareholders with name "Cede & Co."
-- This is a DTC nominee, not a real shareholder

-- STEP 1: First, let's see how many will be affected
SELECT 
    i.display_name as issuer,
    s.first_name,
    s.last_name,
    s.account_number,
    s.email,
    s.created_at,
    COUNT(*) OVER() as total_to_delete
FROM shareholders_new s
JOIN issuers_new i ON i.id = s.issuer_id
WHERE 
    s.first_name ILIKE '%Cede%' 
    OR s.last_name ILIKE '%Cede%'
    OR (s.first_name ILIKE '%Cede%' AND s.last_name ILIKE '%Co%')
ORDER BY i.display_name, s.first_name;

-- STEP 2: Delete related transaction_restrictions first
DELETE FROM transaction_restrictions_new
WHERE shareholder_id IN (
    SELECT id FROM shareholders_new
    WHERE 
        first_name ILIKE '%Cede%' 
        OR last_name ILIKE '%Cede%'
        OR (first_name ILIKE '%Cede%' AND last_name ILIKE '%Co%')
);

-- STEP 3: Now delete the shareholders
DELETE FROM shareholders_new
WHERE 
    first_name ILIKE '%Cede%' 
    OR last_name ILIKE '%Cede%'
    OR (first_name ILIKE '%Cede%' AND last_name ILIKE '%Co%');
