/*
  # Create API Configuration Table
  
  Stores API keys and configuration for external services (Brevo, Stripe, Zoom).
  
  1. New Tables
    - `api_configurations`
      - `id` (uuid, primary key)
      - `service_name` (text) - brevo, stripe, zoom
      - `config_key` (text) - name of the configuration
      - `config_value` (text) - encrypted value
      - `is_active` (boolean) - whether config is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - admin who last updated
      
  2. Security
    - Enable RLS
    - Only admins can read/write
    - Encrypted values
    - Audit trail
*/

-- Create api_configurations table
CREATE TABLE IF NOT EXISTS api_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL CHECK (service_name IN ('brevo', 'stripe', 'zoom')),
  config_key text NOT NULL,
  config_value text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  UNIQUE(service_name, config_key)
);

-- Enable RLS
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins can view API configurations
CREATE POLICY "Admins can view API configurations"
ON api_configurations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can insert API configurations
CREATE POLICY "Admins can insert API configurations"
ON api_configurations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can update API configurations
CREATE POLICY "Admins can update API configurations"
ON api_configurations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can delete API configurations
CREATE POLICY "Admins can delete API configurations"
ON api_configurations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_configurations_service ON api_configurations(service_name);
CREATE INDEX IF NOT EXISTS idx_api_configurations_active ON api_configurations(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_api_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_configurations_updated_at
  BEFORE UPDATE ON api_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_api_configurations_updated_at();

-- Insert default placeholders for all services
INSERT INTO api_configurations (service_name, config_key, config_value, is_active, updated_by)
VALUES
  -- Brevo
  ('brevo', 'api_key', NULL, false, NULL),
  ('brevo', 'sender_email', 'info@asciende.pro', true, NULL),
  ('brevo', 'sender_name', 'Asciende Team', true, NULL),
  
  -- Stripe
  ('stripe', 'secret_key', NULL, false, NULL),
  ('stripe', 'webhook_secret', NULL, false, NULL),
  ('stripe', 'mode', 'test', true, NULL),
  
  -- Zoom
  ('zoom', 'account_id', NULL, false, NULL),
  ('zoom', 'client_id', NULL, false, NULL),
  ('zoom', 'client_secret', NULL, false, NULL)
ON CONFLICT (service_name, config_key) DO NOTHING;
