CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
    id, email, hashed_password,
    first_name, last_name, phone, date_of_birth, gender, designation,
    role, account_type, verification_status, verification_notes,
    clinic_id, clinic_name, clinic_type, address,
    roc_number, rci_number, specialization, is_active, can_assess,
    module_permissions, created_at, updated_at
) VALUES
('usr_sadm_001', 'superadmin@psyichub.com', crypt('password123', gen_salt('bf', 10)),
 'Super', 'Admin', '+917003798750', '2020-12-14', 'male',
 'Techgen Cyber Solution Private Limited',
 'super_admin', 'individual', 'approved',
 'Platform operated by Techgen Cyber Solution Pvt. Ltd.',
 NULL, NULL, NULL,
 'Techgen Cyber Solution Pvt. Ltd., West Bengal, India',
 'U72900WB2020PTC241947', NULL, 'Cyber Security & Technology Solutions', true, true,
 '{"all": true}'::jsonb,
 '2026-01-01 00:00:00+05:30', '2026-01-01 00:00:00+05:30')
ON CONFLICT DO NOTHING;
