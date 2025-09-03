-- Complete invoice system setup with Swedish data
-- This script creates all necessary tables and inserts mock data

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS products_services CASCADE;

-- Create clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products_services table
CREATE TABLE products_services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'st',
    tax_rate DECIMAL(5,2) DEFAULT 25.00,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_line_items table
CREATE TABLE invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    product_service_id INTEGER REFERENCES products_services(id),
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Swedish clients
INSERT INTO clients (name, email, phone, company, address_line1, city, postal_code, country, payment_terms) VALUES
('Joakim Svensson', 'joakim.svensson@techab.se', '+46 70 123 4567', 'Tech Solutions AB', 'Storgatan 15', 'Stockholm', '11122', 'Sverige', 30),
('Anna Lindberg', 'anna.lindberg@designstudio.se', '+46 73 234 5678', 'Creative Design Studio', 'Kungsgatan 42', 'Göteborg', '41103', 'Sverige', 14),
('Erik Andersson', 'erik.andersson@konsult.se', '+46 76 345 6789', 'Andersson Konsult AB', 'Malmövägen 8', 'Malmö', '21145', 'Sverige', 30),
('Sofia Karlsson', 'sofia.karlsson@ehandel.se', '+46 72 456 7890', 'E-handel Nordic', 'Vasagatan 23', 'Uppsala', '75321', 'Sverige', 21),
('Magnus Olsson', 'magnus.olsson@bygg.se', '+46 75 567 8901', 'Olsson Bygg & Anläggning', 'Industrivägen 12', 'Västerås', '72213', 'Sverige', 30),
('Emma Nilsson', 'emma.nilsson@marketing.se', '+46 74 678 9012', 'Digital Marketing Pro', 'Drottninggatan 67', 'Örebro', '70211', 'Sverige', 14);

-- Insert products and services
INSERT INTO products_services (name, description, unit_price, unit, tax_rate, category) VALUES
('Webbutveckling', 'Utveckling av responsiva webbsidor', 1200.00, 'timme', 25.00, 'Utveckling'),
('Databasdesign', 'Design och implementation av databaser', 1500.00, 'timme', 25.00, 'Utveckling'),
('SEO-optimering', 'Sökmotoroptimering för bättre ranking', 800.00, 'timme', 25.00, 'Marknadsföring'),
('Grafisk design', 'Logotyper och visuell identitet', 900.00, 'timme', 25.00, 'Design'),
('Projektledning', 'Ledning av IT-projekt', 1100.00, 'timme', 25.00, 'Konsultation'),
('Systemintegration', 'Integration av olika system', 1400.00, 'timme', 25.00, 'Utveckling'),
('Underhåll webbsida', 'Månadsvis underhåll och uppdateringar', 2500.00, 'månad', 25.00, 'Service'),
('Hosting Premium', 'Premium webbhotell med support', 500.00, 'månad', 25.00, 'Service');

-- Insert historical invoices for Joakim (so AI can reference "last month")
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_amount, total_amount, status, notes) VALUES
('INV-2024-001', 1, '2024-10-15', '2024-11-14', 9600.00, 2400.00, 12000.00, 'paid', 'Webbutveckling för ny företagswebbsida'),
('INV-2024-002', 1, '2024-11-15', '2024-12-15', 4800.00, 1200.00, 6000.00, 'sent', 'Databasdesign och implementation'),
('INV-2024-003', 2, '2024-11-01', '2024-11-15', 7200.00, 1800.00, 9000.00, 'paid', 'Grafisk design och varumärkesarbete'),
('INV-2024-004', 3, '2024-11-10', '2024-12-10', 3300.00, 825.00, 4125.00, 'sent', 'Projektledning och konsultation'),
('INV-2024-005', 4, '2024-11-20', '2024-12-04', 6400.00, 1600.00, 8000.00, 'draft', 'SEO-optimering och marknadsföring');

-- Insert line items for Joakim's invoices
INSERT INTO invoice_line_items (invoice_id, product_service_id, description, quantity, unit_price, tax_rate, line_total) VALUES
-- October invoice (INV-2024-001)
(1, 1, 'Webbutveckling - Startsida och produktsidor', 8.0, 1200.00, 25.00, 9600.00),

-- November invoice (INV-2024-002) - "last month" data
(2, 2, 'Databasdesign för kundregister', 2.0, 1500.00, 25.00, 3000.00),
(2, 6, 'Systemintegration med befintliga system', 1.0, 1400.00, 25.00, 1400.00),
(2, 5, 'Projektledning', 0.4, 1100.00, 25.00, 440.00),

-- Anna's invoice
(3, 4, 'Logotypdesign och varumärkesmanual', 8.0, 900.00, 25.00, 7200.00),

-- Erik's invoice  
(4, 5, 'Projektledning för systemuppgradering', 3.0, 1100.00, 25.00, 3300.00),

-- Sofia's invoice
(5, 3, 'SEO-analys och optimering', 8.0, 800.00, 25.00, 6400.00);

-- Create indexes for better performance
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_clients_email ON clients(email);
