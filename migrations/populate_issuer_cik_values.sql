-- Populate CIK (Central Index Key) values for existing issuers
-- Based on SEC EDGAR database mappings
-- Date: 2025-12-09

-- Update CIK values for known issuers
-- Digital Asset
UPDATE issuers_new
SET cik = '2052162'
WHERE LOWER(issuer_name) LIKE '%digital asset%'
   OR LOWER(display_name) LIKE '%digital asset%';

-- Real Asset
UPDATE issuers_new
SET cik = '2052161'
WHERE LOWER(issuer_name) LIKE '%real asset%'
   OR LOWER(display_name) LIKE '%real asset%';

-- Cal Redwood Acquisition Corp
UPDATE issuers_new
SET cik = '2058359'
WHERE LOWER(issuer_name) LIKE '%cal redwood%'
   OR LOWER(display_name) LIKE '%cal redwood%';

-- Lake Superior
UPDATE issuers_new
SET cik = '2043508'
WHERE LOWER(issuer_name) LIKE '%lake superior%'
   OR LOWER(display_name) LIKE '%lake superior%';

-- Miluna
UPDATE issuers_new
SET cik = '2077033'
WHERE LOWER(issuer_name) LIKE '%miluna%'
   OR LOWER(display_name) LIKE '%miluna%';

-- Apex
UPDATE issuers_new
SET cik = '2079253'
WHERE LOWER(issuer_name) LIKE '%apex%'
   OR LOWER(display_name) LIKE '%apex%';

-- Tailwind
UPDATE issuers_new
SET cik = '2076616'
WHERE LOWER(issuer_name) LIKE '%tailwind%'
   OR LOWER(display_name) LIKE '%tailwind%';

-- Log what was updated
SELECT
  id,
  issuer_name,
  display_name,
  cik
FROM issuers_new
WHERE cik IS NOT NULL
ORDER BY issuer_name;
