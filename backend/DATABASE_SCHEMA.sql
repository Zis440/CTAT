-- Note: Narrative Intelligence = TAT
-- ============================================================================
-- Psyichub - Complete PostgreSQL Schema
-- Generated on 2026-05-19
--
-- Usage:
--   1. Create a fresh PostgreSQL database
--   2. Paste this entire file into pgAdmin Query Tool and execute (F5)
--   3. All tables, enums, indexes, and constraints will be created
--
-- NOTE: Run the optional seed data section at the bottom to populate
--       verification document requirements.
-- ============================================================================


-- +==========================================================================+
-- |  1. ENUM TYPES                                                         |
-- +==========================================================================+

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM (
            'super_admin',
            'clinic_admin',
            'clinic_staff',
            'individual_psychologist',
            'org_admin',
            'org_staff'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accounttype') THEN
        CREATE TYPE accounttype AS ENUM (
            'individual',
            'clinic',
            'organization'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verificationstatus') THEN
        CREATE TYPE verificationstatus AS ENUM (
            'not_submitted',
            'pending',
            'approved',
            'rejected'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactiontype') THEN
        CREATE TYPE transactiontype AS ENUM (
            'credit',
            'debit'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
        CREATE TYPE document_category AS ENUM (
            'professional',
            'business',
            'identity',
            'compliance'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticketstatus') THEN
        CREATE TYPE ticketstatus AS ENUM (
            'open',
            'closed'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointmentstatus') THEN
        CREATE TYPE appointmentstatus AS ENUM (
            'scheduled',
            'completed',
            'cancelled',
            'no_show'
        );
    END IF;
END $$;


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resetrequeststatus') THEN
        CREATE TYPE resetrequeststatus AS ENUM (
            'pending',
            'sent',
            'completed'
        );
    END IF;
END $$;


-- +==========================================================================+
-- |  2. TABLES                                                             |
-- +==========================================================================+

-- ── 2.1  users ──────────────────────────────────────────────────────────────
-- Root table - all other tables reference this.
CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR     NOT NULL PRIMARY KEY,
    email               VARCHAR     NOT NULL,
    hashed_password     VARCHAR,

    -- Profile
    title               VARCHAR,
    first_name          VARCHAR     NOT NULL,
    last_name           VARCHAR,
    bio                 TEXT,
    phone               VARCHAR,
    date_of_birth       DATE,
    gender              VARCHAR,

    -- Avatar
    avatar_path         VARCHAR,

    -- OAuth
    oauth_provider      VARCHAR,
    oauth_provider_id   VARCHAR,
    oauth_avatar_url    VARCHAR,

    -- Role & Account
    role                userrole            NOT NULL,
    account_type        accounttype         NOT NULL,

    -- Verification
    verification_status verificationstatus  NOT NULL,
    verification_notes  VARCHAR,

    -- Clinic-specific
    clinic_id           VARCHAR,
    clinic_name         VARCHAR,
    clinic_type         VARCHAR,
    address             VARCHAR,

    roc_number          VARCHAR,
    rci_number          VARCHAR,
    specialization      VARCHAR,
    designation         VARCHAR,
    professional_domain VARCHAR,
    cv_path             VARCHAR,
    cv_original_filename VARCHAR,

    -- Psychologist Metrics
    rating              FLOAT,
    experience_years    INTEGER,
    total_verifications_done INTEGER NOT NULL DEFAULT 0,

    -- Flags
    is_active           BOOLEAN     NOT NULL,
    can_assess          BOOLEAN     NOT NULL DEFAULT FALSE,
    module_permissions  JSONB       DEFAULT '{}'::jsonb,

    -- Compliance / Consent
    terms_accepted_at   TIMESTAMPTZ,
    terms_accepted_ip   VARCHAR,
    ai_disclaimer_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    refund_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    professional_responsibility_accepted BOOLEAN NOT NULL DEFAULT FALSE,

    -- Signatures
    e_signature_path    VARCHAR,

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ
);


-- ── 2.2  wallets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id              VARCHAR     NOT NULL PRIMARY KEY,
    user_id         VARCHAR     NOT NULL REFERENCES users(id),
    balance_paise   INTEGER     NOT NULL,
    currency        VARCHAR     NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ
);


-- ── 2.3  wallet_transactions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id                  VARCHAR         NOT NULL PRIMARY KEY,
    wallet_id           VARCHAR         NOT NULL REFERENCES wallets(id),
    created_by_id       VARCHAR         REFERENCES users(id),
    type                transactiontype NOT NULL,
    amount_paise        INTEGER         NOT NULL,
    balance_after_paise INTEGER         NOT NULL,
    description         VARCHAR         NOT NULL,
    razorpay_order_id   VARCHAR,
    razorpay_payment_id VARCHAR,
    created_at          TIMESTAMPTZ     DEFAULT now()
);


-- ── 2.4  test_pricing ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_pricing (
    id                      VARCHAR     NOT NULL PRIMARY KEY,
    test_type               VARCHAR     NOT NULL,
    individual_price_paise  INTEGER     NOT NULL,
    clinic_price_paise      INTEGER     NOT NULL,
    is_active               BOOLEAN     NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ
);


-- ── 2.5  clinic_profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_profiles (
    clinic_id           VARCHAR     NOT NULL PRIMARY KEY,
    clinic_name         VARCHAR,
    tagline             VARCHAR,
    contact_email       VARCHAR,
    support_phone       VARCHAR,
    logo_path           VARCHAR,
    cover_path          VARCHAR
);


-- ── 2.5b org_profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_profiles (
    org_id              VARCHAR     NOT NULL PRIMARY KEY, 
    org_name            VARCHAR, 
    tagline             VARCHAR, 
    contact_email       VARCHAR, 
    support_phone       VARCHAR, 
    logo_path           VARCHAR, 
    cover_path          VARCHAR
);


-- ── 2.6  patients ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
    id                  VARCHAR     NOT NULL PRIMARY KEY,
    user_id             VARCHAR     NOT NULL REFERENCES users(id),
    clinic_id           VARCHAR,
    patient_type        VARCHAR     NOT NULL,
    first_name          VARCHAR,
    last_name           VARCHAR(255),
    email               VARCHAR(255),
    phone_number        VARCHAR(20),
    date_of_birth       DATE,
    age                 INTEGER,
    gender              VARCHAR,
    gender_confidence   FLOAT,
    consent_given       BOOLEAN,
    background          TEXT,
    environment         TEXT,
    living_condition    VARCHAR,
    family_structure    VARCHAR,
    residence_type      VARCHAR,
    environment_type    VARCHAR,
    education_level     VARCHAR,
    occupation          VARCHAR,
    socioeconomic_status VARCHAR,
    notes               TEXT,
    total_sessions      INTEGER,
    first_session_date  TIMESTAMPTZ DEFAULT now(),
    last_session_date   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ
);


-- ── 2.6  sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id                  VARCHAR     NOT NULL PRIMARY KEY,
    user_id             VARCHAR     NOT NULL REFERENCES users(id),
    patient_id          VARCHAR     NOT NULL REFERENCES patients(id),
    session_data_path   VARCHAR     NOT NULL,
    pdf_filename        VARCHAR,
    cards_examined      VARCHAR,
    patient_name        VARCHAR,
    validation_status   VARCHAR,
    validator_name      VARCHAR,
    validator_license   VARCHAR,
    validation_date     TIMESTAMPTZ,
    validation_notes    TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);


-- ── 2.7  support_tickets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
    id          VARCHAR         NOT NULL PRIMARY KEY,
    user_id     VARCHAR         NOT NULL REFERENCES users(id),
    subject     VARCHAR         NOT NULL,
    message     VARCHAR         NOT NULL,
    status      ticketstatus    NOT NULL,
    created_at  TIMESTAMPTZ     DEFAULT now(),
    updated_at  TIMESTAMPTZ
);


-- ── 2.8  appointments ──────────────────────────────────────────────────────
-- Tracks scheduled appointments between a psychologist (user) and a patient.
-- Linked to: users (psychologist), patients, and optionally a clinic.
CREATE TABLE IF NOT EXISTS appointments (
    id                  VARCHAR             NOT NULL PRIMARY KEY,
    psychologist_id     VARCHAR             NOT NULL REFERENCES users(id),
    patient_id          VARCHAR             NOT NULL REFERENCES patients(id),
    clinic_id           VARCHAR,
    appointment_date    DATE                NOT NULL,
    start_time          VARCHAR             NOT NULL,   -- HH:MM 24h format
    duration_minutes    INTEGER             NOT NULL DEFAULT 60,
    status              appointmentstatus   NOT NULL DEFAULT 'scheduled',
    purpose             VARCHAR,
    notes               TEXT,
    created_at          TIMESTAMPTZ         DEFAULT now(),
    updated_at          TIMESTAMPTZ
);


-- ── 2.9  user_verification_documents ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_verification_documents (
    id                  VARCHAR             NOT NULL PRIMARY KEY,
    user_id             VARCHAR             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_category   document_category   NOT NULL,
    document_type       VARCHAR(100)        NOT NULL,
    file_path           TEXT                NOT NULL,
    original_filename   TEXT,
    status              VARCHAR(20)         NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    is_required         BOOLEAN             NOT NULL DEFAULT true,
    uploaded_at         TIMESTAMPTZ         DEFAULT now(),

    -- OCR and Validation Fields
    detected_document_type VARCHAR(100),
    ocr_fields          JSON,
    ocr_confidence      FLOAT,
    verification_response JSON,
    verification_status VARCHAR(50),

    CONSTRAINT uq_user_document_type UNIQUE (user_id, document_type)
);


-- ── 2.9  verification_document_requirements ─────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_document_requirements (
    id                  SERIAL              PRIMARY KEY,
    account_type        VARCHAR(20)         NOT NULL,
    clinic_subtype      VARCHAR(50),
    document_type       VARCHAR(100)        NOT NULL,
    document_category   document_category   NOT NULL,
    is_required         BOOLEAN             NOT NULL,
    label               VARCHAR(200)        NOT NULL,
    description         TEXT
);


-- ── 2.10 assessments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR NOT NULL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    clinic_price NUMERIC(10, 2),
    psychologist_price NUMERIC(10, 2),
    is_coming_soon BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ── 2.11 password_resets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
    id                  VARCHAR             NOT NULL PRIMARY KEY,
    user_id             VARCHAR             NOT NULL REFERENCES users(id),
    email               VARCHAR             NOT NULL,
    token               VARCHAR,
    status              resetrequeststatus  NOT NULL,
    created_at          TIMESTAMPTZ         DEFAULT now(),
    expires_at          TIMESTAMPTZ
);


-- +==========================================================================+
-- |  3. UNIQUE CONSTRAINTS                                                 |
-- +==========================================================================+

ALTER TABLE test_pricing
    ADD CONSTRAINT test_pricing_test_type_key UNIQUE (test_type);


-- +==========================================================================+
-- |  4. INDEXES                                                            |
-- +==========================================================================+

-- users
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email       ON users (email);
CREATE INDEX IF NOT EXISTS        ix_users_clinic_id   ON users (clinic_id);

-- wallets
CREATE UNIQUE INDEX IF NOT EXISTS ix_wallets_user_id   ON wallets (user_id);

-- wallet_transactions
CREATE INDEX IF NOT EXISTS ix_wallet_transactions_wallet_id ON wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS ix_wallet_transactions_created_by_id ON wallet_transactions (created_by_id);

-- patients
CREATE INDEX IF NOT EXISTS ix_patients_user_id    ON patients (user_id);
CREATE INDEX IF NOT EXISTS ix_patients_clinic_id  ON patients (clinic_id);

-- sessions
CREATE INDEX IF NOT EXISTS ix_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_patient_id ON sessions (patient_id);

-- support_tickets
CREATE INDEX IF NOT EXISTS ix_support_tickets_user_id ON support_tickets (user_id);

-- appointments
CREATE INDEX IF NOT EXISTS ix_appointments_psychologist_id  ON appointments (psychologist_id);
CREATE INDEX IF NOT EXISTS ix_appointments_patient_id       ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS ix_appointments_clinic_id        ON appointments (clinic_id);
CREATE INDEX IF NOT EXISTS ix_appointments_date             ON appointments (appointment_date);

-- user_verification_documents
CREATE INDEX IF NOT EXISTS idx_uvd_user_id        ON user_verification_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_uvd_document_type  ON user_verification_documents (document_type);

-- verification_document_requirements
CREATE INDEX IF NOT EXISTS idx_vdr_account_type   ON verification_document_requirements (account_type);
CREATE INDEX IF NOT EXISTS idx_vdr_clinic_subtype ON verification_document_requirements (clinic_subtype);

-- password_resets
CREATE INDEX IF NOT EXISTS ix_password_resets_email   ON password_resets (email);
CREATE INDEX IF NOT EXISTS ix_password_resets_token   ON password_resets (token);
CREATE INDEX IF NOT EXISTS ix_password_resets_user_id ON password_resets (user_id);


-- +==========================================================================+
-- |  5. SEED DATA - Verification Document Requirements                     |
-- |     (Optional - run this section to populate the requirements config)   |
-- +==========================================================================+

-- Clear existing seed data (safe for re-runs)
TRUNCATE verification_document_requirements RESTART IDENTITY;

-- ── INDIVIDUAL ──────────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('individual', NULL, 'professional_license',      'professional', true, 'Professional Credential (RCI Certificate)',    'Upload your RCI registration certificate or equivalent professional credential. Optional if you already verified during signup.'),
    ('individual', NULL, 'government_id',             'identity',     true,  'Government ID (Aadhaar / Passport / DL)',      'A valid government-issued photo ID for identity verification.'),
    ('individual', NULL, 'pan_card',                  'identity',     false, 'PAN Card (Optional)', 'PAN card for identity and tax verification.'),
    ('individual', NULL, 'qualification_certificate',  'professional', false, 'Qualification Certificate / Letterhead / Business Card', 'M.Phil/Ph.D/M.A. Psychology degree, your professional letterhead, or business card (optional but speeds up verification).');

-- ── CLINIC - sole_proprietorship ────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'sole_proprietorship', 'trade_license',              'business',     true,  'Any ONE Business Proof',                    'Municipal trade license, shop establishment, or other business proof.'),
    ('clinic', 'sole_proprietorship', 'owner_professional_license', 'professional', true,  'Owner''s Professional License',             'RCI registration or state license of the sole proprietor.'),
    ('clinic', 'sole_proprietorship', 'owner_aadhaar',              'identity',     true,  'Aadhaar Card of Owner',                     'Aadhaar card of the owner.'),
    ('clinic', 'sole_proprietorship', 'owner_pan',                  'compliance',   true,  'PAN Card of Owner',                         'PAN card of the sole proprietor.'),
    ('clinic', 'sole_proprietorship', 'gst_certificate',            'compliance',   false, 'GST Certificate',                           'GST registration certificate.'),
    ('clinic', 'sole_proprietorship', 'address_proof',              'compliance',   false, 'Address Proof',                             'Utility bill, rent agreement, or property tax receipt for clinic address.');

-- ── CLINIC - partnership ────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'partnership', 'partnership_deed',          'business',     true,  'Partnership Deed',                          'Registered partnership deed document.'),
    ('clinic', 'partnership', 'trade_license',             'business',     true,  'Trade License / Clinic Registration',       'Municipal trade license or clinic registration certificate.'),
    ('clinic', 'partnership', 'lead_professional_license', 'professional', true,  'Professional License of Lead Psychologist', 'RCI registration or state license of the lead practicing psychologist.'),
    ('clinic', 'partnership', 'partner_government_id',     'identity',     true,  'Government ID of Authorized Partner',       'Aadhaar, passport, or DL of the authorized signing partner.'),
    ('clinic', 'partnership', 'firm_pan',                  'compliance',   true,  'PAN of Firm',                               'PAN card of the partnership firm.'),
    ('clinic', 'partnership', 'gst_certificate',           'compliance',   true,  'GST Certificate',                           'GST registration certificate.');

-- ── CLINIC - llp ────────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'llp', 'certificate_of_incorporation',      'business',     true,  'Certificate of Incorporation',                         'MCA-issued certificate of incorporation for the LLP.'),
    ('clinic', 'llp', 'llp_registration',                  'business',     true,  'LLP Registration Certificate',                         'LLP registration certificate from the Registrar of Companies.'),
    ('clinic', 'llp', 'trade_license',                     'business',     true,  'Trade License',                                        'Municipal trade license for the clinic premises.'),
    ('clinic', 'llp', 'responsible_professional_license',   'professional', true,  'Professional License of Responsible Practitioner',     'RCI or state license of the designated responsible practitioner.'),
    ('clinic', 'llp', 'signatory_id',                      'identity',     true,  'Authorized Signatory ID',                              'Government-issued photo ID of the authorized signatory.'),
    ('clinic', 'llp', 'company_pan',                       'compliance',   true,  'Company PAN',                                          'PAN card of the LLP entity.'),
    ('clinic', 'llp', 'gst_certificate',                   'compliance',   true,  'GST Certificate',                                      'GST registration certificate.');

-- ── CLINIC - private_limited ────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'private_limited', 'certificate_of_incorporation', 'business',     true,  'Certificate of Incorporation (CIN)',        'MCA-issued certificate of incorporation (CIN).'),
    ('clinic', 'private_limited', 'trade_license',                'business',     true,  'Trade License / Business Proof',            'Municipal trade license or business proof for clinic premises.'),
    ('clinic', 'private_limited', 'clinical_head_license',        'professional', true,  'Professional License of Clinical Head',     'RCI or state license of the clinical head / chief psychologist.'),
    ('clinic', 'private_limited', 'representative_id',            'identity',     true,  'Authorized Representative ID',              'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'private_limited', 'company_pan',                  'compliance',   true,  'Company PAN',                               'PAN card of the Private Limited company.'),
    ('clinic', 'private_limited', 'gst_certificate',              'compliance',   true,  'GST Certificate',                           'GST registration certificate.'),
    ('clinic', 'private_limited', 'board_authorization_letter',   'compliance',   false, 'Board Authorization Letter',                'Board resolution authorizing the representative to act on behalf of the company.');

-- ── CLINIC - opc ────────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'opc', 'certificate_of_incorporation', 'business',     true,  'Certificate of Incorporation (CIN)',        'MCA-issued certificate of incorporation (CIN) for OPC.'),
    ('clinic', 'opc', 'trade_license',                'business',     false, 'Trade License / Business Proof',            'Municipal trade license or business proof.'),
    ('clinic', 'opc', 'owner_professional_license',   'professional', true,  'Professional License of Owner',             'RCI registration or state license of the sole owner.'),
    ('clinic', 'opc', 'owner_government_id',          'identity',     true,  'Government ID of Owner',                    'Aadhaar, passport, or driving license of the owner.'),
    ('clinic', 'opc', 'company_pan',                  'compliance',   true,  'Company PAN',                               'PAN card of the OPC.');

-- ── CLINIC - public_limited ─────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'public_limited', 'certificate_of_incorporation', 'business',     true,  'Certificate of Incorporation (CIN)',        'MCA-issued certificate of incorporation (CIN).'),
    ('clinic', 'public_limited', 'trade_license',                'business',     true,  'Trade License / Business Proof',            'Municipal trade license or business proof.'),
    ('clinic', 'public_limited', 'clinical_head_license',        'professional', true,  'Professional License of Clinical Head',     'RCI or state license of the clinical head / chief psychologist.'),
    ('clinic', 'public_limited', 'representative_id',            'identity',     true,  'Authorized Representative ID',              'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'public_limited', 'company_pan',                  'compliance',   true,  'Company PAN',                               'PAN card of the Public Limited company.'),
    ('clinic', 'public_limited', 'gst_certificate',              'compliance',   true,  'GST Certificate',                           'GST registration certificate.');

-- ── CLINIC - trust ──────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'trust', 'trust_deed',             'business',     true,  'Trust Deed',                                'Registered Trust Deed.'),
    ('clinic', 'trust', 'practice_license',       'business',     false, 'Clinic / Practice License',                 'License to operate a clinical practice.'),
    ('clinic', 'trust', 'lead_therapist_license', 'professional', true,  'Professional License of Lead Therapist',    'RCI or state license of the lead therapist / psychologist.'),
    ('clinic', 'trust', 'representative_id',      'identity',     true,  'ID of Authorized Representative',           'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'trust', 'trust_pan',              'compliance',   true,  'Trust PAN',                                 'PAN card of the Trust entity.');

-- ── CLINIC - society ────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'society', 'registration_certificate', 'business',     true,  'Registration Certificate',                  'Society Registration Certificate.'),
    ('clinic', 'society', 'practice_license',         'business',     false, 'Clinic / Practice License',                 'License to operate a clinical practice.'),
    ('clinic', 'society', 'lead_therapist_license',   'professional', true,  'Professional License of Lead Therapist',    'RCI or state license of the lead therapist / psychologist.'),
    ('clinic', 'society', 'representative_id',        'identity',     true,  'ID of Authorized Representative',           'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'society', 'society_pan',              'compliance',   true,  'Society PAN',                               'PAN card of the Society entity.');

-- ── CLINIC - section_8 ──────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'section_8', 'certificate_of_incorporation', 'business',     true,  'Certificate of Incorporation (CIN)',        'MCA-issued certificate of incorporation (CIN) for Section 8 Company.'),
    ('clinic', 'section_8', 'practice_license',             'business',     false, 'Clinic / Practice License',                 'License to operate a clinical practice.'),
    ('clinic', 'section_8', 'lead_therapist_license',       'professional', true,  'Professional License of Lead Therapist',    'RCI or state license of the lead therapist / psychologist.'),
    ('clinic', 'section_8', 'representative_id',            'identity',     true,  'ID of Authorized Representative',           'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'section_8', 'company_pan',                  'compliance',   true,  'Company PAN',                               'PAN card of the Section 8 company.');

-- ── CLINIC - cooperative ────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'cooperative', 'registration_certificate', 'business',     true,  'Registration Certificate',                  'Co-operative Society Registration Certificate.'),
    ('clinic', 'cooperative', 'practice_license',         'business',     false, 'Clinic / Practice License',                 'License to operate a clinical practice.'),
    ('clinic', 'cooperative', 'lead_therapist_license',   'professional', true,  'Professional License of Lead Therapist',    'RCI or state license of the lead therapist / psychologist.'),
    ('clinic', 'cooperative', 'representative_id',        'identity',     true,  'ID of Authorized Representative',           'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'cooperative', 'cooperative_pan',          'compliance',   true,  'Co-operative PAN',                          'PAN card of the Co-operative society.');

-- ── CLINIC - ngo ────────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'ngo', 'ngo_registration',       'business',     true,  'Trust Registration / NGO Certificate',      'Society registration, trust deed, or Section 8 company certificate.'),
    ('clinic', 'ngo', 'practice_license',       'business',     true,  'Clinic / Practice License',                 'License to operate a clinical practice or mental health facility.'),
    ('clinic', 'ngo', 'lead_therapist_license', 'professional', true,  'Professional License of Lead Therapist',    'RCI or state license of the lead therapist / psychologist.'),
    ('clinic', 'ngo', 'representative_id',      'identity',     true,  'ID of Authorized Representative',           'Government-issued photo ID of the authorized representative.'),
    ('clinic', 'ngo', 'tax_exemption_docs',     'compliance',   false, '80G / 12A Registration Documents',          'Tax exemption certificates under Section 80G or 12A.'),
    ('clinic', 'ngo', 'ngo_pan',                'compliance',   true,  'NGO PAN',                                   'PAN card of the NGO / Trust entity.');

-- ── CLINIC - government ─────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'government', 'government_authorization',   'business',     true, 'Government Authorization Letter',      'Official authorization letter from the relevant government authority.'),
    ('clinic', 'government', 'hospital_registration',      'business',     true, 'Hospital / Clinic Registration',       'Registration certificate of the government hospital or clinic.'),
    ('clinic', 'government', 'practitioner_license',       'professional', true, 'Professional License of Practitioner', 'RCI or state license of the practicing psychologist.'),
    ('clinic', 'government', 'representative_official_id', 'identity',     true, 'Official ID of Representative',        'Government-issued official identity card of the authorized representative.');

-- ── CLINIC - other ──────────────────────────────────────────────────────────
INSERT INTO verification_document_requirements
    (account_type, clinic_subtype, document_type, document_category, is_required, label, description)
VALUES
    ('clinic', 'other', 'business_registration', 'business',     true,  'Business Registration Proof',  'Any valid business registration document (trade license, MSME, etc.).'),
    ('clinic', 'other', 'professional_license',  'professional', true,  'Professional License',         'RCI or state license of the lead practitioner.'),
    ('clinic', 'other', 'authorized_person_id',  'identity',     true,  'Authorized Person ID',         'Government-issued photo ID of the authorized person.');


-- ── ASSESSMENTS ─────────────────────────────────────────────────────────────
INSERT INTO assessments (id, slug, name, category, clinic_price, psychologist_price, is_coming_soon) VALUES 
('ASM_1', 'tat', 'Narrative Intelligence', 'Projective', 20.00, 30.00, FALSE),
('ASM_2', 'm-paci', 'Pre Adolescent Personality Assessment Intelligence', 'Self-Report Inventory', NULL, NULL, TRUE),
('ASM_3', 'conners', 'Attention Deficit And Hyperactivity Intelligence', 'Behavioral Rating', NULL, NULL, TRUE),
('ASM_4', 'scl90', 'Psychological Symptom Checklist Intelligence', 'Symptom Checklist', NULL, NULL, TRUE),
('ASM_5', 'caars', 'Adult Attention Deficit And Hyperactivity Intelligence', 'Behavioral Rating', NULL, NULL, TRUE),
('ASM_6', 'dsmd-adolescent', 'Adolescent Developmental And Behavioral Intelligence', 'Behavioral Assessment', NULL, NULL, TRUE),
('ASM_7', 'dsmd-child', 'Child Developmental And Behavioral Intelligence', 'Behavioral Assessment', NULL, NULL, TRUE),
('ASM_8', 'maci', 'Adolescent Personality Intelligence', 'Self-Report Inventory', NULL, NULL, TRUE),
('ASM_9', 'mcmi', 'Adult Personality Intelligence', 'Self-Report Inventory', NULL, NULL, TRUE),
('ASM_10', 'freud-dream', 'Dream Insite Intelligence', 'Psychoanalytic', NULL, NULL, TRUE);


-- +==========================================================================+
-- |  6. ADDITIONAL TABLES (Audit, Anonymous Links, Org Requests)           |
-- +==========================================================================+

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orgrequeststatus') THEN
        CREATE TYPE orgrequeststatus AS ENUM (
            'pending',
            'assigned',
            'completed',
            'expired'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verificationrequeststatus') THEN
        CREATE TYPE verificationrequeststatus AS ENUM (
            'PENDING',
            'ASSIGNED',
            'VERIFIED',
            'REJECTED',
            'EXPIRED',
            'ESCALATED'
        );
    END IF;
END $$;

-- ── 2.12 audit_logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id                  VARCHAR     NOT NULL PRIMARY KEY,
    user_id             VARCHAR     NOT NULL REFERENCES users(id),
    target_user_id      VARCHAR     REFERENCES users(id),
    org_id              VARCHAR     REFERENCES users(id),
    action              VARCHAR     NOT NULL,
    details             JSONB,
    signature_hash      VARCHAR,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_target_user_id ON audit_logs (target_user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_org_id ON audit_logs (org_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);

-- ── 2.13 anonymous_links ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anonymous_links (
    token                   VARCHAR     NOT NULL PRIMARY KEY,
    org_id                  VARCHAR     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id           VARCHAR     NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    used                    BOOLEAN     NOT NULL DEFAULT FALSE,
    resulting_patient_id    VARCHAR     REFERENCES patients(id) ON DELETE SET NULL,
    resulting_session_id    VARCHAR     REFERENCES sessions(id) ON DELETE SET NULL,
    selected_cards          JSON,
    request_validation      BOOLEAN     NOT NULL DEFAULT FALSE,
    consent_given           BOOLEAN     NOT NULL DEFAULT FALSE,
    consent_timestamp       TIMESTAMPTZ,
    consent_ip_address      VARCHAR,
    created_at              TIMESTAMPTZ DEFAULT now(),
    expires_at              TIMESTAMPTZ NOT NULL,
    used_at                 TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_anonymous_links_org_id ON anonymous_links (org_id);

-- ── 2.14 org_assessment_requests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_assessment_requests (
    id                          VARCHAR             NOT NULL PRIMARY KEY,
    org_id                      VARCHAR             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id                  VARCHAR             NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assessment_id           VARCHAR     NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    assigned_psychologist_id    VARCHAR             REFERENCES users(id) ON DELETE SET NULL,
    status                      orgrequeststatus    NOT NULL DEFAULT 'pending',
    created_at                  TIMESTAMPTZ         DEFAULT now(),
    sla_deadline                TIMESTAMPTZ         NOT NULL,
    assigned_at                 TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_org_assessment_requests_org_id ON org_assessment_requests (org_id);
CREATE INDEX IF NOT EXISTS ix_org_assessment_requests_patient_id ON org_assessment_requests (patient_id);
CREATE INDEX IF NOT EXISTS ix_org_assessment_requests_assigned_psychologist_id ON org_assessment_requests (assigned_psychologist_id);

-- ── 2.15 verification_requests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
    id                          VARCHAR                     NOT NULL PRIMARY KEY,
    session_id                  VARCHAR                     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    assigned_psychologist_id    VARCHAR                     REFERENCES users(id) ON DELETE SET NULL,
    status                      verificationrequeststatus   NOT NULL DEFAULT 'PENDING',
    assignment_attempts         INTEGER                     NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    assigned_at                 TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    notes                       VARCHAR
);
CREATE INDEX IF NOT EXISTS ix_verification_requests_session_id ON verification_requests (session_id);
CREATE INDEX IF NOT EXISTS ix_verification_requests_assigned_psychologist_id ON verification_requests (assigned_psychologist_id);
CREATE INDEX IF NOT EXISTS ix_verification_requests_status ON verification_requests (status);


-- ============================================================================
-- ✅  Schema setup complete.
-- ============================================================================


/* 
   THE ENTIRE "NEW ADDITIONS (APPENDED)" SECTION HAS BEEN INTEGRATED 
   DIRECTLY INTO THE CORE TABLES AND ENUMS ABOVE.
   THIS PREVENTS CONFLICTS FROM REDUNDANT MIGRATION SNarrative IntelligenceEMENTS.
*/

-- -----------------------------------------------------------------------------
-- Employee Mental Well-being (Screening Level 1) Tables
-- -----------------------------------------------------------------------------

CREATE TABLE screening_users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR,
    email VARCHAR UNIQUE,
    hashed_password VARCHAR,
    age INTEGER NOT NULL,
    role VARCHAR DEFAULT 'employee',
    organization_id VARCHAR
);

CREATE TABLE screening_level1_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES screening_users(id),
    core_patient_id VARCHAR,
    core_user_id VARCHAR,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    session_data_path VARCHAR,
    pdf_filename VARCHAR,
    patient_context JSON
);

CREATE TABLE screening_questionnaire_responses (
    id VARCHAR NOT NULL PRIMARY KEY,
    assessment_id VARCHAR(36) REFERENCES screening_level1_sessions(id),
    question_id VARCHAR,
    score INTEGER
);

CREATE TABLE screening_game_metrics (
    id VARCHAR NOT NULL PRIMARY KEY,
    assessment_id VARCHAR(36) REFERENCES screening_level1_sessions(id),
    game_type VARCHAR,
    score FLOAT,
    movement_count INTEGER,
    completion_time_seconds FLOAT,
    advanced_metrics JSON
);

CREATE TABLE screening_story_assessments (
    id VARCHAR NOT NULL PRIMARY KEY,
    assessment_id VARCHAR(36) REFERENCES screening_level1_sessions(id),
    card_id VARCHAR,
    story_text TEXT,
    movement_count INTEGER,
    completion_time_seconds FLOAT
);

CREATE TABLE screening_reports (
    id VARCHAR NOT NULL PRIMARY KEY,
    assessment_id VARCHAR(36) REFERENCES screening_level1_sessions(id) UNIQUE,
    json_data JSON,
    patient_id VARCHAR REFERENCES patients(id),
    status VARCHAR DEFAULT 'Draft',
    verified_by_id VARCHAR REFERENCES users(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    changes_history JSON
);
