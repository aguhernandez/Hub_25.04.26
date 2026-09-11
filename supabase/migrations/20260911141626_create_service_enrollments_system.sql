/*
# Create Service Enrollments System

## Purpose
Connect athletes with professional services. An athlete can enroll in a service
offered by a professional they are already connected to. Track payment status
and service access status. Support manual/external payments with confirmation flow.

## New Tables

### 1. `service_enrollments`
Tracks an athlete's enrollment in a professional's service.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `athlete_id` | uuid FK→profiles(id) | The enrolled athlete |
| `service_id` | uuid FK→stripe_products(id) | The service (stripe_products row with type='coaching') |
| `professional_id` | uuid FK→profiles(id) | The professional who owns the service |
| `status` | text NOT NULL | Enrollment state: available, pending_payment, active, payment_due, overdue, restricted, blocked, cancelled |
| `payment_status` | text NOT NULL | Payment state: none, pending_confirmation, paid, overdue, refunded |
| `payment_method` | text | How athlete pays: stripe, manual_link, manual_instructions |
| `payment_link` | text | External payment URL (Mercado Pago, PayPal, etc.) |
| `payment_instructions` | text | Manual payment instructions (bank transfer, CBU, etc.) |
| `receipt_url` | text | URL to uploaded payment receipt/proof |
| `athlete_payment_confirmed` | boolean | Athlete clicked "I've made the payment" |
| `professional_payment_confirmed` | boolean | Professional confirmed receiving payment |
| `confirmed_at` | timestamptz | When professional confirmed |
| `activated_at` | timestamptz | When service became active |
| `expires_at` | timestamptz | When enrollment expires (for subscriptions) |
| `notes` | text | Internal notes |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 2. `service_payment_receipts`
Stores payment receipt/proof uploads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `enrollment_id` | uuid FK→service_enrollments(id) ON DELETE CASCADE | |
| `file_url` | text NOT NULL | Storage URL of receipt |
| `file_name` | text | Original filename |
| `uploaded_by` | uuid FK→profiles(id) | Who uploaded (athlete or professional) |
| `created_at` | timestamptz | |

## Constraints
- UNIQUE on (athlete_id, service_id) — one enrollment per athlete per service
- CHECK on status values
- CHECK on payment_status values

## Security (RLS)
- Athletes can see their own enrollments
- Professionals can see enrollments for their services
- Athletes can INSERT their own enrollments (only for services by their connected professionals)
- Athletes can UPDATE their own enrollment's payment confirmation fields
- Professionals can UPDATE enrollments for their services (confirm payment, change status)
- Admins have full access

## Notes
- Does NOT modify existing Stripe integration
- Does NOT implement Stripe Connect
- Manual/external payments only — Asciende records status, does not process payments
*/

-- ============================================
-- 1. Create service_enrollments table
-- ============================================
CREATE TABLE IF NOT EXISTS service_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES stripe_products(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('available', 'pending_payment', 'active', 'payment_due', 'overdue', 'restricted', 'blocked', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending_confirmation', 'paid', 'overdue', 'refunded')),
  payment_method text DEFAULT 'manual_link'
    CHECK (payment_method IN ('stripe', 'manual_link', 'manual_instructions')),
  payment_link text,
  payment_instructions text,
  receipt_url text,
  athlete_payment_confirmed boolean NOT NULL DEFAULT false,
  professional_payment_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, service_id)
);

-- ============================================
-- 2. Create service_payment_receipts table
-- ============================================
CREATE TABLE IF NOT EXISTS service_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES service_enrollments(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3. Enable RLS
-- ============================================
ALTER TABLE service_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_payment_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_service_enrollments_athlete ON service_enrollments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_service_enrollments_professional ON service_enrollments(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_enrollments_service ON service_enrollments(service_id);
CREATE INDEX IF NOT EXISTS idx_service_enrollments_status ON service_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_service_payment_receipts_enrollment ON service_payment_receipts(enrollment_id);

-- ============================================
-- 5. Updated_at trigger for service_enrollments
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_service_enrollments_updated_at'
  ) THEN
    CREATE TRIGGER tr_service_enrollments_updated_at
    BEFORE UPDATE ON service_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 6. RLS Policies for service_enrollments
-- ============================================

-- SELECT: athletes see their own enrollments; professionals see enrollments for their services; admins see all
DROP POLICY IF EXISTS "athletes_select_own_enrollments" ON service_enrollments;
CREATE POLICY "athletes_select_own_enrollments"
  ON service_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "professionals_select_own_service_enrollments" ON service_enrollments;
CREATE POLICY "professionals_select_own_service_enrollments"
  ON service_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "admins_select_all_enrollments" ON service_enrollments;
CREATE POLICY "admins_select_all_enrollments"
  ON service_enrollments FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- INSERT: athletes can enroll in services by their connected professionals
DROP POLICY IF EXISTS "athletes_insert_own_enrollments" ON service_enrollments;
CREATE POLICY "athletes_insert_own_enrollments"
  ON service_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = athlete_id
    AND (
      -- Athlete must be connected to this professional via assigned_trainer_id or assigned_nutritionist_id
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
          p.assigned_trainer_id = service_enrollments.professional_id
          OR p.assigned_nutritionist_id = service_enrollments.professional_id
        )
      )
    )
  );

-- Admins can insert any enrollment
DROP POLICY IF EXISTS "admins_insert_enrollments" ON service_enrollments;
CREATE POLICY "admins_insert_enrollments"
  ON service_enrollments FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- UPDATE: athletes can update their own payment confirmation fields
DROP POLICY IF EXISTS "athletes_update_own_enrollments" ON service_enrollments;
CREATE POLICY "athletes_update_own_enrollments"
  ON service_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Professionals can update enrollments for their services
DROP POLICY IF EXISTS "professionals_update_own_service_enrollments" ON service_enrollments;
CREATE POLICY "professionals_update_own_service_enrollments"
  ON service_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

-- Admins can update any enrollment
DROP POLICY IF EXISTS "admins_update_enrollments" ON service_enrollments;
CREATE POLICY "admins_update_enrollments"
  ON service_enrollments FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- DELETE: only admins can delete enrollments
DROP POLICY IF EXISTS "admins_delete_enrollments" ON service_enrollments;
CREATE POLICY "admins_delete_enrollments"
  ON service_enrollments FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ============================================
-- 7. RLS Policies for service_payment_receipts
-- ============================================

-- SELECT: athletes and professionals involved in the enrollment can see receipts
DROP POLICY IF EXISTS "athletes_select_own_receipts" ON service_payment_receipts;
CREATE POLICY "athletes_select_own_receipts"
  ON service_payment_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_enrollments se
      WHERE se.id = service_payment_receipts.enrollment_id
      AND se.athlete_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "professionals_select_service_receipts" ON service_payment_receipts;
CREATE POLICY "professionals_select_service_receipts"
  ON service_payment_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_enrollments se
      WHERE se.id = service_payment_receipts.enrollment_id
      AND se.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_select_all_receipts" ON service_payment_receipts;
CREATE POLICY "admins_select_all_receipts"
  ON service_payment_receipts FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- INSERT: athletes can upload receipts for their enrollments
DROP POLICY IF EXISTS "athletes_insert_own_receipts" ON service_payment_receipts;
CREATE POLICY "athletes_insert_own_receipts"
  ON service_payment_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_enrollments se
      WHERE se.id = service_payment_receipts.enrollment_id
      AND se.athlete_id = auth.uid()
    )
  );

-- Admins can insert receipts
DROP POLICY IF EXISTS "admins_insert_receipts" ON service_payment_receipts;
CREATE POLICY "admins_insert_receipts"
  ON service_payment_receipts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- DELETE: only admins can delete receipts
DROP POLICY IF EXISTS "admins_delete_receipts" ON service_payment_receipts;
CREATE POLICY "admins_delete_receipts"
  ON service_payment_receipts FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');
