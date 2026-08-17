/*
  # Add 'coaching' to stripe_products type constraint

  Extends the type check constraint to allow 'coaching' as a valid product type.
*/

ALTER TABLE stripe_products DROP CONSTRAINT IF EXISTS stripe_products_type_check;

ALTER TABLE stripe_products ADD CONSTRAINT stripe_products_type_check
  CHECK (type IN ('program', 'membership', 'coaching'));
