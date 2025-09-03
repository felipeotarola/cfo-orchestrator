-- Seed Chart of Accounts with standard business accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES
-- Assets
('1000', 'Cash and Cash Equivalents', 'Asset'),
('1100', 'Checking Account', 'Asset'),
('1200', 'Savings Account', 'Asset'),
('1300', 'Accounts Receivable', 'Asset'),
('1400', 'Inventory', 'Asset'),
('1500', 'Prepaid Expenses', 'Asset'),
('1600', 'Equipment', 'Asset'),
('1700', 'Accumulated Depreciation - Equipment', 'Asset'),

-- Liabilities
('2000', 'Accounts Payable', 'Liability'),
('2100', 'Credit Card Payable', 'Liability'),
('2200', 'Accrued Expenses', 'Liability'),
('2300', 'Payroll Liabilities', 'Liability'),
('2400', 'Sales Tax Payable', 'Liability'),
('2500', 'Long-term Debt', 'Liability'),

-- Equity
('3000', 'Owner''s Equity', 'Equity'),
('3100', 'Retained Earnings', 'Equity'),

-- Revenue
('4000', 'Sales Revenue', 'Revenue'),
('4100', 'Service Revenue', 'Revenue'),
('4200', 'Interest Income', 'Revenue'),
('4300', 'Other Income', 'Revenue'),

-- Expenses
('5000', 'Cost of Goods Sold', 'Expense'),
('5100', 'Salaries and Wages', 'Expense'),
('5200', 'Rent Expense', 'Expense'),
('5300', 'Utilities Expense', 'Expense'),
('5400', 'Office Supplies', 'Expense'),
('5500', 'Marketing and Advertising', 'Expense'),
('5600', 'Professional Services', 'Expense'),
('5700', 'Insurance Expense', 'Expense'),
('5800', 'Depreciation Expense', 'Expense'),
('5900', 'Travel and Entertainment', 'Expense'),
('6000', 'Miscellaneous Expense', 'Expense');
