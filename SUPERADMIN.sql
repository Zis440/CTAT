CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
    id, email, hashed_password,
    first_name, last_name, phone, date_of_birth, gender, designation,
    role, account_type, verification_status, verification_notes,
    clinic_id, clinic_name, clinic_type, address,
    roc_number, rci_number, specialization, is_active, can_assess,
    module_permissions, created_at, updated_at
) VALUES
('usr_sadm_001', 'superadmin@coretat.com', crypt('password123', gen_salt('bf', 10)),
 'Super', 'Admin', '+917003798750', '2020-12-14', 'male',
 'CoreTAT Administrator',
 'super_admin', 'individual', 'approved',
 'Platform operated by Zis440',
 NULL, NULL, NULL,
 'CoreTAT Platform, West Bengal, India',
 'U72900WB2020PTC241947', NULL, 'Psychological Intelligence & Clinical Psychometrics', true, true,
 '{"all": true}'::jsonb,
 '2026-01-01 00:00:00+05:30', '2026-01-01 00:00:00+05:30')
ON CONFLICT DO NOTHING;
