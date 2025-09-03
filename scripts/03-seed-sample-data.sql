-- Seed sample clients
INSERT INTO clients (name, email, phone, address, payment_terms, credit_limit) VALUES
('Acme Corporation', 'billing@acme.com', '555-0101', '123 Business St, City, ST 12345', 30, 50000.00),
('TechStart Inc', 'accounts@techstart.com', '555-0102', '456 Innovation Ave, City, ST 12345', 15, 25000.00),
('Global Solutions LLC', 'finance@globalsolutions.com', '555-0103', '789 Enterprise Blvd, City, ST 12345', 45, 75000.00),
('Local Services Co', 'admin@localservices.com', '555-0104', '321 Main St, City, ST 12345', 30, 15000.00),
('Digital Agency Pro', 'billing@digitalagency.com', '555-0105', '654 Creative Way, City, ST 12345', 30, 30000.00);

-- Seed sample vendors
INSERT INTO vendors (name, email, phone, address, payment_terms) VALUES
('Office Supply Plus', 'orders@officesupply.com', '555-0201', '111 Supply Chain Dr, City, ST 12345', 30),
('CloudTech Services', 'billing@cloudtech.com', '555-0202', '222 Tech Park Ln, City, ST 12345', 15),
('Marketing Masters', 'accounts@marketingmasters.com', '555-0203', '333 Ad Agency St, City, ST 12345', 30),
('Legal Eagles LLP', 'billing@legaleagles.com', '555-0204', '444 Law Firm Ave, City, ST 12345', 15),
('Facility Management Co', 'invoices@facilityco.com', '555-0205', '555 Property Mgmt Blvd, City, ST 12345', 30);

-- Get account IDs for transactions
DO $$
DECLARE
    checking_account_id UUID;
    revenue_account_id UUID;
    ar_account_id UUID;
    expense_account_id UUID;
    ap_account_id UUID;
    client_acme_id UUID;
    client_techstart_id UUID;
    vendor_office_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO checking_account_id FROM chart_of_accounts WHERE account_code = '1100';
    SELECT id INTO revenue_account_id FROM chart_of_accounts WHERE account_code = '4000';
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1300';
    SELECT id INTO expense_account_id FROM chart_of_accounts WHERE account_code = '5100';
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2000';
    
    -- Get client IDs
    SELECT id INTO client_acme_id FROM clients WHERE name = 'Acme Corporation';
    SELECT id INTO client_techstart_id FROM clients WHERE name = 'TechStart Inc';
    SELECT id INTO vendor_office_id FROM vendors WHERE name = 'Office Supply Plus';

    -- Sample invoices
    INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_amount, total_amount, status) VALUES
    ('INV-2024-001', client_acme_id, '2024-01-15', '2024-02-14', 15000.00, 1200.00, 16200.00, 'Paid'),
    ('INV-2024-002', client_techstart_id, '2024-01-20', '2024-02-04', 8500.00, 680.00, 9180.00, 'Sent'),
    ('INV-2024-003', client_acme_id, '2024-02-01', '2024-03-03', 22000.00, 1760.00, 23760.00, 'Sent');

    -- Sample invoice line items
    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, line_total)
    SELECT i.id, 'Consulting Services - January', 150.00, 100.00, 15000.00
    FROM invoices i WHERE i.invoice_number = 'INV-2024-001';

    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, line_total)
    SELECT i.id, 'Software Development', 85.00, 100.00, 8500.00
    FROM invoices i WHERE i.invoice_number = 'INV-2024-002';

    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, line_total)
    SELECT i.id, 'Project Management Services', 220.00, 100.00, 22000.00
    FROM invoices i WHERE i.invoice_number = 'INV-2024-003';

    -- Sample transactions with proper double-entry
    -- Revenue transaction (Invoice payment received)
    INSERT INTO transactions (transaction_date, reference_number, description, total_amount, transaction_type, client_id, status)
    VALUES ('2024-02-15', 'PMT-001', 'Payment received from Acme Corporation', 16200.00, 'Income', client_acme_id, 'Posted');

    -- Get the transaction ID for line items
    INSERT INTO transaction_line_items (transaction_id, account_id, description, debit_amount, credit_amount)
    SELECT t.id, checking_account_id, 'Cash received', 16200.00, 0.00
    FROM transactions t WHERE t.reference_number = 'PMT-001';

    INSERT INTO transaction_line_items (transaction_id, account_id, description, debit_amount, credit_amount)
    SELECT t.id, ar_account_id, 'Accounts Receivable', 0.00, 16200.00
    FROM transactions t WHERE t.reference_number = 'PMT-001';

    -- Expense transaction
    INSERT INTO transactions (transaction_date, reference_number, description, total_amount, transaction_type, vendor_id, status)
    VALUES ('2024-01-30', 'EXP-001', 'Office supplies purchase', 850.00, 'Expense', vendor_office_id, 'Posted');

    INSERT INTO transaction_line_items (transaction_id, account_id, description, debit_amount, credit_amount)
    SELECT t.id, expense_account_id, 'Office supplies', 850.00, 0.00
    FROM transactions t WHERE t.reference_number = 'EXP-001';

    INSERT INTO transaction_line_items (transaction_id, account_id, description, debit_amount, credit_amount)
    SELECT t.id, checking_account_id, 'Cash payment', 0.00, 850.00
    FROM transactions t WHERE t.reference_number = 'EXP-001';

    -- Sample payments
    INSERT INTO payments (payment_date, amount, payment_method, reference_number, client_id, invoice_id)
    SELECT '2024-02-15', 16200.00, 'Bank Transfer', 'PMT-001', client_acme_id, i.id
    FROM invoices i WHERE i.invoice_number = 'INV-2024-001';

    -- Sample recurring billing
    INSERT INTO recurring_billing (client_id, template_name, frequency, amount, description, next_billing_date)
    VALUES 
    (client_acme_id, 'Monthly Retainer', 'Monthly', 5000.00, 'Monthly consulting retainer', '2024-03-01'),
    (client_techstart_id, 'Quarterly Support', 'Quarterly', 12000.00, 'Quarterly technical support', '2024-04-01');

    -- Sample budget categories
    INSERT INTO budget_categories (name, account_id, budget_year, monthly_budget) VALUES
    ('Salary Budget', expense_account_id, 2024, 25000.00),
    ('Marketing Budget', (SELECT id FROM chart_of_accounts WHERE account_code = '5500'), 2024, 5000.00),
    ('Office Expenses', (SELECT id FROM chart_of_accounts WHERE account_code = '5400'), 2024, 2000.00);

END $$;
