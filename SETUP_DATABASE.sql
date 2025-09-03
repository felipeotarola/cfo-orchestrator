-- Run this in your Supabase SQL Editor to enable photo uploads for invoices and receipts

-- 1. Create receipts table for expense tracking
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
    submitted_by VARCHAR(255),
    approved_by VARCHAR(255),
    approval_date DATE,
    reimbursement_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create attachments table for storing file references (photos, PDFs, etc.)
CREATE TABLE IF NOT EXISTS attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'invoice', 'receipt', 'client', etc.
    entity_id UUID NOT NULL, -- references the related record
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL, -- 'image/jpeg', 'application/pdf', etc.
    file_size BIGINT, -- size in bytes
    file_url TEXT NOT NULL, -- Vercel Blob URL
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    description TEXT,
    is_primary BOOLEAN DEFAULT false -- for setting main/cover image
);

-- 3. Add attachment support to existing invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON receipts(vendor_name);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON attachments(file_type);

-- 5. Create receipt categories for easier classification
CREATE TABLE IF NOT EXISTS receipt_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    tax_deductible BOOLEAN DEFAULT true,
    default_tax_rate DECIMAL(5,2) DEFAULT 25.00, -- Swedish VAT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert common Swedish business expense categories
INSERT INTO receipt_categories (name, description, tax_deductible, default_tax_rate) VALUES 
('Kontorsmaterial', 'Office supplies and equipment', true, 25.00),
('Måltider', 'Business meals and entertainment', true, 12.00),
('Resa', 'Travel expenses including transportation and accommodation', true, 25.00),
('Telefon och Internet', 'Phone and internet services', true, 25.00),
('Programvara', 'Software licenses and subscriptions', true, 25.00),
('Marknadsföring', 'Marketing and advertising expenses', true, 25.00),
('Utbildning', 'Training and education costs', true, 25.00),
('Hyra och Lokaler', 'Rent and facility costs', true, 25.00),
('Försäkringar', 'Business insurance premiums', true, 25.00),
('Revisor och Juridik', 'Accounting and legal services', true, 25.00)
ON CONFLICT (name) DO NOTHING;

-- 7. Function to update attachment count
CREATE OR REPLACE FUNCTION update_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for the affected entity
    IF TG_OP = 'INSERT' THEN
        -- Increment count
        IF NEW.entity_type = 'invoice' THEN
            UPDATE invoices SET attachment_count = attachment_count + 1 WHERE id = NEW.entity_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement count
        IF OLD.entity_type = 'invoice' THEN
            UPDATE invoices SET attachment_count = GREATEST(0, attachment_count - 1) WHERE id = OLD.entity_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to automatically update attachment counts
CREATE TRIGGER trigger_update_attachment_count
    AFTER INSERT OR DELETE ON attachments
    FOR EACH ROW EXECUTE FUNCTION update_attachment_count();

-- 9. Create a view for easy receipt reporting
CREATE OR REPLACE VIEW receipt_summary AS
SELECT 
    r.*,
    rc.tax_deductible,
    (SELECT COUNT(*) FROM attachments a WHERE a.entity_type = 'receipt' AND a.entity_id = r.id) as attachment_count,
    (SELECT file_url FROM attachments a WHERE a.entity_type = 'receipt' AND a.entity_id = r.id AND a.is_primary = true LIMIT 1) as primary_image_url
FROM receipts r
LEFT JOIN receipt_categories rc ON r.category = rc.name;
