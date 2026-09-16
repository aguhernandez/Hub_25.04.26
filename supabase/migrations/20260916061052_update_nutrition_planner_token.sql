
-- Update the nutrition planner token hash to match the token: planner_71a6e1bf0ed740638958a79232f1a24a
-- The bridge hashes the incoming token with SHA-256 and compares against token_hash
UPDATE external_planner_tokens
SET token_hash = encode(digest('planner_71a6e1bf0ed740638958a79232f1a24a', 'sha256'), 'hex'),
    is_active = true,
    last_used_at = now()
WHERE planner_type = 'nutrition';
