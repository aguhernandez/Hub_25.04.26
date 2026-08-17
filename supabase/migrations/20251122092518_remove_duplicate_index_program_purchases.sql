/*
  # Remove Duplicate Index on program_purchases

  ## Overview
  Removes the duplicate index idx_program_purchases_product since it's identical to
  idx_program_purchases_program. Having duplicate indexes wastes storage and slows down writes.

  ## Index Removed
  - `idx_program_purchases_product` on program_purchases table

  ## Index Retained
  - `idx_program_purchases_program` (kept as it has a clearer name)

  ## Performance Impact
  - Reduces storage overhead
  - Slightly improves INSERT/UPDATE performance on program_purchases
  - No impact on query performance (same coverage with one index)
*/

-- Drop the duplicate index
DROP INDEX IF EXISTS idx_program_purchases_product;
