-- Fix database structure for CFO Orchestrator
-- This script ensures consistent table structure

-- Create clients table with consistent structure
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Sverige',
    payment_terms INTEGER DEFAULT 30,
    tax_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table with consistent structure
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    attachment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SEK',
    receipt_date DATE NOT NULL,
    category VARCHAR(100),
    description TEXT,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    attachment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT,
    file_url TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    description TEXT,
    is_primary BOOLEAN DEFAULT false
);

-- Insert sample clients if they don't exist
INSERT INTO clients (name, email, phone, company, address_line1, city, postal_code, country, payment_terms) 
VALUES 
('Joakim Svensson', 'joakim.svensson@techab.se', '+46 70 123 4567', 'Tech Solutions AB', 'Storgatan 15', 'Stockholm', '11122', 'Sverige', 30),
('Anna Lindberg', 'anna.lindberg@designstudio.se', '+46 73 234 5678', 'Creative Design Studio', 'Kungsgatan 42', 'Göteborg', '41103', 'Sverige', 14),
('Erik Andersson', 'erik.andersson@konsult.se', '+46 76 345 6789', 'Andersson Konsult AB', 'Malmövägen 8', 'Malmö', '21145', 'Sverige', 30)
ON CONFLICT (email) DO NOTHING;

-- Insert sample invoices with correct client IDs
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_amount, total_amount, status, notes) 
SELECT 
    'INV-2024-001',
    c.id,
    '2024-10-15',
    '2024-11-14',
    9600.00,
    2400.00,
    12000.00,
    'paid',
    'Webbutveckling för ny företagswebbsida'
FROM clients c 
WHERE c.email = 'joakim.svensson@techab.se'
AND NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-2024-001');

INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_amount, total_amount, status, notes) 
SELECT 
    'INV-2024-002',
    c.id,
    '2024-11-15',
    '2024-12-15',
    4800.00,
    1200.00,
    6000.00,
    'sent',
    'Databasdesign och implementation'
FROM clients c 
WHERE c.email = 'joakim.svensson@techab.se'
AND NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-2024-002');

INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_amount, total_amount, status, notes) 
SELECT 
    'INV-2024-003',
    c.id,
    '2024-11-01',
    '2024-11-15',
    7200.00,
    1800.00,
    9000.00,
    'paid',
    'Grafisk design och varumärkesarbete'
FROM clients c 
WHERE c.email = 'anna.lindberg@designstudio.se'
AND NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-2024-003');

INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_amount, total_amount, status, notes) 
SELECT 
    'INV-2024-004',
    c.id,
    '2024-11-10',
    '2024-12-10',
    3300.00,
    825.00,
    4125.00,
    'sent',
    'Projektledning och konsultation'
FROM clients c 
WHERE c.email = 'erik.andersson@konsult.se'
AND NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-2024-004');

-- Insert sample receipts
INSERT INTO receipts (receipt_number, vendor_name, amount, receipt_date, category, status)
VALUES 
('KV-2024-001', 'Office Depot', 1250.00, '2024-11-01', 'Kontorsmaterial', 'approved'),
('KV-2024-002', 'ICA Maxi', 680.00, '2024-11-05', 'Måltider', 'pending'),
('KV-2024-003', 'SAS Airlines', 2400.00, '2024-11-10', 'Resa', 'approved')
ON CONFLICT (receipt_number) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
