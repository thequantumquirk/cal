-- Replace 'YOUR_NEW_EMAIL@example.com' with the email you will login with.
-- Replace 'EXISTING_SHAREHOLDER_EMAIL@example.com' with the email of the record you want to take over.

UPDATE shareholders_new
SET 
    email = 'YOUR_NEW_EMAIL@example.com', -- The email you will sign up/login with
    user_id = NULL                        -- Reset this so it can be "claimed" again
WHERE 
    email = 'EXISTING_SHAREHOLDER_EMAIL@example.com'; -- The current email in the database
