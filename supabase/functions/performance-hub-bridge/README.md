# Performance Hub reader

Read-only bridge for the Performance application. GET `context` accepts `athlete_id` or `athlete_email`, plus optional inclusive `date_from`/`date_to`. It reads the completed/calendar, passport, anthropometry, wellness and nutrition sources with paging and per-section errors. GET `streams` accepts the same athlete identity plus `activity_id` and `source=external|executed`.

Every request requires both a valid Hub JWT (`Authorization`) and an active token of type `performance` (`X-Planner-Token`). Both Supabase session JWTs and signed Hub satellite JWTs are supported. Athlete access is checked against current profiles, never user-editable JWT roles. An athlete can read themselves; trainers/head coaches can read assigned athletes; admins can read all. All source queries are athlete-scoped. The function writes only an access audit record.

Wearable timeseries are delegated to `open-wearables`, preserving ownership and consent checks. Its satellite fallback is restricted to the timeseries-read action and independently verifies the Performance token and signed JWT. Other wearable actions continue to require the original Supabase user session. Gateway `verify_jwt=false` is necessary for the custom Hub JWT; handler authentication remains mandatory for every action.

`tests/performance-hub-bridge.mjs` runs with Node and the existing esbuild dependency. It mocks the auth/provider/database boundaries and exercises the real bridge and wearable handler control flow: missing/invalid credentials, app-token type, action scope, athlete ownership, wearable consent, pagination beyond 1,000 rows, partial errors, stream ownership and date/method validation.

No migrations, original-data copies or changes to Endurance's API are needed. Pair with the Performance client adapter. Production-user authentication and provider responses still require an authenticated end-to-end check after the frontend is published.
