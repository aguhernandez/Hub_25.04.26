/*
# Add Payment Instruction Fields to stripe_products

## Purpose
Allow professionals to define external payment instructions/links on their services
so athletes know how to pay manually (Mercado Pago, PayPal, bank transfer, etc.).

## Changes
- Add `payment_link` text column to stripe_products (external payment URL)
- Add `payment_instructions` text column to stripe_products (manual instructions)
- Add `payment_method` text column to stripe_products (stripe | manual_link | manual_instructions)

## Notes
- These are optional fields, defaults to NULL
- Does NOT modify existing Stripe integration
- Professionals who use Stripe keep their existing checkout_url flow
*/

ALTER TABLE stripe_products
  ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE stripe_products
  ADD COLUMN IF NOT EXISTS payment_instructions text;
ALTER TABLE stripe_products
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'manual_link'
    CHECK (payment_method IN ('stripe', 'manual_link', 'manual_instructions'));
