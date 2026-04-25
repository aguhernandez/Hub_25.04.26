/*
  # AI Usage Metrics System

  1. New Tables
    - `ai_usage_metrics`
      - Tracks daily AI food analysis usage
      - Monitors performance and costs
      - Enables auto-scaling decisions

  2. Features
    - Daily aggregated metrics
    - Success/failure tracking
    - Performance monitoring
    - Phase tracking (huggingface, selfhosted, ondevice)
    - Automatic alerts at thresholds

  3. Security
    - RLS enabled
    - Only admins can read metrics
*/

CREATE TABLE IF NOT EXISTS ai_usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_requests integer DEFAULT 0,
  successful_requests integer DEFAULT 0,
  failed_requests integer DEFAULT 0,
  avg_processing_time_ms numeric DEFAULT 0,
  avg_confidence numeric DEFAULT 0,
  phase_active text DEFAULT 'huggingface' CHECK (phase_active IN ('huggingface', 'selfhosted', 'ondevice')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_metrics_date ON ai_usage_metrics(date DESC);

-- Enable RLS
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view metrics
CREATE POLICY "Admins can view AI metrics"
  ON ai_usage_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert/update (edge functions)
CREATE POLICY "System can manage AI metrics"
  ON ai_usage_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_usage_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_usage_metrics_updated_at
  BEFORE UPDATE ON ai_usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_usage_metrics_updated_at();