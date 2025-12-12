-- Populate issuer documents from SEC EDGAR JSON data
-- Extracted from https://data.sec.gov/submissions/CIK{number}.json for each issuer

-- Helper: Get issuer IDs (we'll use these in the inserts)
-- Run this first to see the issuer mappings:
-- SELECT id, display_name, cik FROM issuers_new WHERE cik IS NOT NULL ORDER BY display_name;

-- =====================================================
-- DIGITAL ASSET ACQUISITION CORP (CIK: 2052162)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-02-07',
  'https://www.sec.gov/Archives/edgar/data/2052162/000121390025011355/ea0229742-01.htm'
FROM issuers_new WHERE cik = '2052162';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-04-23',
  'https://www.sec.gov/Archives/edgar/data/2052162/000121390025034599/ea0229742-09.htm'
FROM issuers_new WHERE cik = '2052162';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-04-30',
  'https://www.sec.gov/Archives/edgar/data/2052162/000121390025037755/ea0229742-10.htm'
FROM issuers_new WHERE cik = '2052162';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '10-Q', 'Quarterly Report - Q3 2025', '2025-11-14',
  'https://www.sec.gov/Archives/edgar/data/2052162/000121390025110841/ea0264929-10q_digital.htm'
FROM issuers_new WHERE cik = '2052162';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Business Combination Agreement', '2025-05-01',
  'https://www.sec.gov/Archives/edgar/data/2052162/000121390025038444/ea0240140-8k_digital.htm'
FROM issuers_new WHERE cik = '2052162';

-- =====================================================
-- REAL ASSET ACQUISITION CORP (CIK: 2052161)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-02-07',
  'https://www.sec.gov/Archives/edgar/data/2052161/000121390025011360/ea0229743-01.htm'
FROM issuers_new WHERE cik = '2052161';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-04-23',
  'https://www.sec.gov/Archives/edgar/data/2052161/000121390025034666/ea0229743-09.htm'
FROM issuers_new WHERE cik = '2052161';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-04-30',
  'https://www.sec.gov/Archives/edgar/data/2052161/000121390025037749/ea0229743-10.htm'
FROM issuers_new WHERE cik = '2052161';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '10-Q', 'Quarterly Report - Q3 2025', '2025-11-14',
  'https://www.sec.gov/Archives/edgar/data/2052161/000121390025110164/ea0264931-10q_real.htm'
FROM issuers_new WHERE cik = '2052161';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Business Combination Agreement', '2025-05-01',
  'https://www.sec.gov/Archives/edgar/data/2052161/000121390025038449/ea0240105-8k_realasset.htm'
FROM issuers_new WHERE cik = '2052161';

-- =====================================================
-- CAL REDWOOD ACQUISITION CORP (CIK: 2058359)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-03-03',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025019475/ea0232145-01.htm'
FROM issuers_new WHERE cik = '2058359';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-05-21',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025046176/ea0232145-08.htm'
FROM issuers_new WHERE cik = '2058359';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-05-23',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025047444/ea0232145-09.htm'
FROM issuers_new WHERE cik = '2058359';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '10-Q', 'Quarterly Report - Q3 2025', '2025-11-13',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025110089/ea0263867-10q_calred.htm'
FROM issuers_new WHERE cik = '2058359';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Business Combination Announcement', '2025-06-17',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025055207/ea0245915-8k_calred.htm'
FROM issuers_new WHERE cik = '2058359';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Entry into Material Agreement', '2025-05-27',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025047867/ea0243417-8k_calredwood.htm'
FROM issuers_new WHERE cik = '2058359';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'IMTA', 'Investment Management Trust Agreement', '2025-05-22',
  'https://www.sec.gov/Archives/edgar/data/2058359/000121390025045030/ea023214507ex10-2_calred.htm'
FROM issuers_new WHERE cik = '2058359';

-- =====================================================
-- LAKE SUPERIOR ACQUISITION CORP (CIK: 2043508)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-05-09',
  'https://www.sec.gov/Archives/edgar/data/2043508/000147793225004420/lake_s1.htm'
FROM issuers_new WHERE cik = '2043508';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-09-19',
  'https://www.sec.gov/Archives/edgar/data/2043508/000147793225006894/lake_s1a.htm'
FROM issuers_new WHERE cik = '2043508';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-10-07',
  'https://www.sec.gov/Archives/edgar/data/2043508/000147793225007409/lake_424b4.htm'
FROM issuers_new WHERE cik = '2043508';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '10-Q', 'Quarterly Report - Q3 2025', '2025-11-14',
  'https://www.sec.gov/Archives/edgar/data/2043508/000147793225008266/lake_10q.htm'
FROM issuers_new WHERE cik = '2043508';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Entry into Material Agreement', '2025-10-10',
  'https://www.sec.gov/Archives/edgar/data/2043508/000147793225007478/lake_8k.htm'
FROM issuers_new WHERE cik = '2043508';

-- =====================================================
-- MILUNA ACQUISITION CORP (CIK: 2077033)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-09-02',
  'https://www.sec.gov/Archives/edgar/data/2077033/000164117225012498/forms-1.htm'
FROM issuers_new WHERE cik = '2077033';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-09-29',
  'https://www.sec.gov/Archives/edgar/data/2077033/000149315225016064/forms-1a.htm'
FROM issuers_new WHERE cik = '2077033';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-10-22',
  'https://www.sec.gov/Archives/edgar/data/2077033/000149315225018946/form424b4.htm'
FROM issuers_new WHERE cik = '2077033';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '10-Q', 'Quarterly Report - Q3 2025', '2025-11-17',
  'https://www.sec.gov/Archives/edgar/data/2077033/000149315225023849/form10-q.htm'
FROM issuers_new WHERE cik = '2077033';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Business Combination Agreement', '2025-10-28',
  'https://www.sec.gov/Archives/edgar/data/2077033/000149315225019797/form8-k.htm'
FROM issuers_new WHERE cik = '2077033';

-- =====================================================
-- APEX TREASURY CORP (CIK: 2079253)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-08-11',
  'https://www.sec.gov/Archives/edgar/data/2079253/000121390025074316/ea0252373-01.htm'
FROM issuers_new WHERE cik = '2079253';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-10-07',
  'https://www.sec.gov/Archives/edgar/data/2079253/000121390025097069/ea0252373-04.htm'
FROM issuers_new WHERE cik = '2079253';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-10-28',
  'https://www.sec.gov/Archives/edgar/data/2079253/000121390025103160/ea0252373-06.htm'
FROM issuers_new WHERE cik = '2079253';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '10-Q', 'Quarterly Report - Q3 2025', '2025-12-05',
  'https://www.sec.gov/Archives/edgar/data/2079253/000121390025118842/ea0268039-10q_apex.htm'
FROM issuers_new WHERE cik = '2079253';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Business Combination Agreement', '2025-10-31',
  'https://www.sec.gov/Archives/edgar/data/2079253/000121390025104692/ea0263267-8k_apex.htm'
FROM issuers_new WHERE cik = '2079253';

-- =====================================================
-- TAILWIND 2.0 ACQUISITION CORP (CIK: 2076616)
-- =====================================================
INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1', 'Initial Registration Statement', '2025-08-12',
  'https://www.sec.gov/Archives/edgar/data/2076616/000121390025075099/ea0248592-02.htm'
FROM issuers_new WHERE cik = '2076616';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, 'S-1/A', 'Amendment to Registration Statement (Latest)', '2025-10-17',
  'https://www.sec.gov/Archives/edgar/data/2076616/000121390025099978/ea0248592-04.htm'
FROM issuers_new WHERE cik = '2076616';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '424B4', 'Final Prospectus', '2025-11-07',
  'https://www.sec.gov/Archives/edgar/data/2076616/000121390025107669/ea0248592-06.htm'
FROM issuers_new WHERE cik = '2076616';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Business Combination Agreement', '2025-11-12',
  'https://www.sec.gov/Archives/edgar/data/2076616/000121390025109378/ea0265176-8k_tailwind2.htm'
FROM issuers_new WHERE cik = '2076616';

INSERT INTO issuer_documents (issuer_id, document_type_code, title, filing_date, url)
SELECT id, '8-K', 'Current Report - Recent Filing', '2025-12-02',
  'https://www.sec.gov/Archives/edgar/data/2076616/000121390025117326/ea0268095-8k_tailwind2.htm'
FROM issuers_new WHERE cik = '2076616';

-- Verify the inserts
SELECT
  i.display_name,
  i.cik,
  dt.name as document_type,
  d.title,
  d.filing_date
FROM issuer_documents d
JOIN issuers_new i ON d.issuer_id = i.id
JOIN document_types dt ON d.document_type_code = dt.code
ORDER BY i.display_name, dt.display_order;
