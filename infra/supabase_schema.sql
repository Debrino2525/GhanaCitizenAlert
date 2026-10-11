-- =============================================================
-- CitizenAlert Ghana — Supabase PostgreSQL + PostGIS Schema
-- =============================================================

-- Enable Spatial Extension (PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(16) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    ghanapost_code VARCHAR(20) NOT NULL,
    region VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326),
    media JSONB DEFAULT '[]'::jsonb,
    is_anonymous BOOLEAN DEFAULT FALSE,
    reporter_data JSONB,
    reporter_trust_score INT DEFAULT 80,
    assigned_agency VARCHAR(50) NOT NULL DEFAULT 'GPS_CID',
    secondary_agencies JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED_PENDING_TRIAGE',
    severity VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    is_public_eligible BOOLEAN DEFAULT FALSE,
    is_public_published BOOLEAN DEFAULT FALSE,
    public_corroborations INT DEFAULT 0,
    investigator_notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Emergency Alerts Table (Amber / Red Alerts)
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('AMBER', 'RED', 'CIVIL_DISASTER')),
    title VARCHAR(255) NOT NULL,
    subject_name VARCHAR(150),
    subject_age INT,
    subject_photo_url TEXT,
    last_seen_location TEXT NOT NULL,
    ghanapost_code VARCHAR(20) DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_km NUMERIC(5, 2) NOT NULL DEFAULT 35.0,
    details TEXT NOT NULL,
    suspect_details TEXT,
    vehicle_details TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    issued_by_agency VARCHAR(50) DEFAULT 'GPS_CID',
    issuing_officer_name VARCHAR(150),
    approving_commander_name VARCHAR(150),
    badge_number VARCHAR(50),
    active_until TIMESTAMPTZ NOT NULL,
    sightings_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Citizen Sighting Tips Table
CREATE TABLE IF NOT EXISTS alert_sightings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES emergency_alerts(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    location_name VARCHAR(255) NOT NULL,
    ghanapost_code VARCHAR(20) DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    comment TEXT NOT NULL,
    photo_url TEXT,
    reporter_phone VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Cryptographic Evidence Ledger (Act 772 Compliance)
CREATE TABLE IF NOT EXISTS audit_evidence_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    actor_ip VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    row_delta JSONB,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial Indexes for Real-Time Radius Lookups
CREATE INDEX IF NOT EXISTS idx_incidents_geo ON incidents USING GIST(location);

-- Enable Supabase Realtime on tables
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_sightings;

-- Enable Row Level Security (RLS) & allow anonymous/authenticated read & insert
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_evidence_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert on incidents" ON incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on incidents" ON incidents FOR UPDATE USING (true);

CREATE POLICY "Allow public read on emergency_alerts" ON emergency_alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on emergency_alerts" ON emergency_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on emergency_alerts" ON emergency_alerts FOR UPDATE USING (true);

CREATE POLICY "Allow public read on alert_sightings" ON alert_sightings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on alert_sightings" ON alert_sightings FOR INSERT WITH CHECK (true);

-- 4. Cryptographic Evidence Ledger RLS (Act 772 Compliance: Append-only by service/system)
CREATE POLICY "Allow authenticated read on audit_ledger" ON audit_evidence_ledger FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Allow insert on audit_ledger" ON audit_evidence_ledger FOR INSERT TO authenticated, anon WITH CHECK (true);
-- Note: UPDATE and DELETE are intentionally not allowed on audit_evidence_ledger to preserve chain-of-custody immutability.

-- 5. Supabase Storage Bucket & RLS Policies for Evidence Vault
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public and authenticated uploads to evidence bucket
CREATE POLICY "Allow public uploads to evidence bucket"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'evidence');

-- Allow read of evidence files
CREATE POLICY "Allow public reads from evidence bucket"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'evidence');

-- 6. Supabase Storage Bucket for Amber Alert Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('alert-photos', 'alert-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow public uploads to alert-photos bucket"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'alert-photos');

CREATE POLICY "Allow public reads from alert-photos bucket"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'alert-photos');

-- 7. Statutory Appeals & Takedowns Table (Ghana Data Protection Act 2012, Act 843, Sections 32-43)
CREATE TABLE IF NOT EXISTS statutory_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    tracking_code VARCHAR(32) NOT NULL,
    bulletin_title TEXT,
    applicant_name VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    legal_basis VARCHAR(150) DEFAULT 'Ghana Data Protection Act 2012 (Act 843, Sections 32-43)',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'GRANTED', 'REJECTED')),
    dpo_notes TEXT,
    resolved_by VARCHAR(150),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime & RLS on statutory_appeals
ALTER PUBLICATION supabase_realtime ADD TABLE statutory_appeals;
ALTER TABLE statutory_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on statutory_appeals" ON statutory_appeals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read on statutory_appeals" ON statutory_appeals FOR SELECT USING (true);
CREATE POLICY "Allow public update on statutory_appeals" ON statutory_appeals FOR UPDATE USING (true);


