/*
  # Create Invoices System
  
  Complete invoicing system for trainers and admins to generate and send invoices.
  
  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique) - Auto-generated: INV-2024-0001
      - `issued_by` (uuid) - Trainer/Admin who issued it
      - `issued_to` (uuid) - Client/Athlete
      - `issue_date` (date)
      - `due_date` (date)
      - `status` (text) - draft, sent, paid, overdue, cancelled
      - `subtotal` (decimal)
      - `tax_rate` (decimal) - Tax percentage (e.g., 0.21 for 21%)
      - `tax_amount` (decimal)
      - `total` (decimal)
      - `currency` (text) - USD, EUR, etc.
      - `notes` (text)
      - `payment_method` (text) - bank_transfer, stripe, cash, other
      - `payment_date` (date)
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid) - References invoices
      - `description` (text)
      - `quantity` (decimal)
      - `unit_price` (decimal)
      - `total` (decimal)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on both tables
    - Trainers can create/view/edit their own invoices
    - Admins can view/edit all invoices
    - Athletes can view invoices issued to them
    
  3. Indexes
    - invoice_number (unique)
    - issued_by, issued_to
    - status
    
  4. Functions
    - Auto-generate invoice numbers
    - Calculate totals
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  issued_by uuid REFERENCES profiles(id) NOT NULL,
  issued_to uuid REFERENCES profiles(id) NOT NULL,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal decimal(10,2) DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  notes text,
  payment_method text,
  payment_date date,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_by ON invoices(issued_by);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_to ON invoices(issued_to);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Invoices policies

-- Trainers and admins can view invoices they issued
CREATE POLICY "Users can view own issued invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  issued_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Athletes can view invoices issued to them
CREATE POLICY "Clients can view their invoices"
ON invoices FOR SELECT
TO authenticated
USING (issued_to = auth.uid());

-- Trainers and admins can create invoices
CREATE POLICY "Trainers and admins can create invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('trainer', 'admin')
  )
  AND issued_by = auth.uid()
);

-- Users can update their own issued invoices
CREATE POLICY "Users can update own issued invoices"
ON invoices FOR UPDATE
TO authenticated
USING (
  issued_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  issued_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can delete invoices
CREATE POLICY "Admins can delete invoices"
ON invoices FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Invoice items policies

-- Users can view invoice items for invoices they can see
CREATE POLICY "Users can view invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND (
      invoices.issued_by = auth.uid()
      OR invoices.issued_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);

-- Users can create items for their own invoices
CREATE POLICY "Users can create invoice items"
ON invoice_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.issued_by = auth.uid()
  )
);

-- Users can update items for their own invoices
CREATE POLICY "Users can update invoice items"
ON invoice_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.issued_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.issued_by = auth.uid()
  )
);

-- Users can delete items from their own invoices
CREATE POLICY "Users can delete invoice items"
ON invoice_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.issued_by = auth.uid()
  )
);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  current_year text;
  invoice_num text;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get the next invoice number for this year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM 'INV-' || current_year || '-(\d+)')
      AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';
  
  -- Format: INV-2024-0001
  invoice_num := 'INV-' || current_year || '-' || LPAD(next_number::text, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Create function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(invoice_uuid uuid)
RETURNS void AS $$
DECLARE
  subtotal_amount decimal(10,2);
  tax_amount_calc decimal(10,2);
  total_amount decimal(10,2);
  current_tax_rate decimal(5,2);
BEGIN
  -- Get current tax rate
  SELECT tax_rate INTO current_tax_rate
  FROM invoices
  WHERE id = invoice_uuid;
  
  -- Calculate subtotal from items
  SELECT COALESCE(SUM(total), 0)
  INTO subtotal_amount
  FROM invoice_items
  WHERE invoice_id = invoice_uuid;
  
  -- Calculate tax
  tax_amount_calc := subtotal_amount * (current_tax_rate / 100);
  
  -- Calculate total
  total_amount := subtotal_amount + tax_amount_calc;
  
  -- Update invoice
  UPDATE invoices
  SET 
    subtotal = subtotal_amount,
    tax_amount = tax_amount_calc,
    total = total_amount
  WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to recalculate totals when items change
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_invoice_totals(OLD.invoice_id);
  ELSE
    -- Calculate item total
    NEW.total := NEW.quantity * NEW.unit_price;
    PERFORM calculate_invoice_totals(NEW.invoice_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_invoice_totals();
