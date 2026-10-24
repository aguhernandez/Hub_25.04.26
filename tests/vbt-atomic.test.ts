// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
let db: PGlite;
const athlete = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const session = { client_session_id: clientId, load_kg:80, exercise_name:'squat', source:'manual', session_date:'2026-10-24' };
const rep = {rep_number:1, source:'manual', mean_concentric_velocity_ms:.6, is_valid:true};
async function save(s: object, r: object[]) { return db.query('select public.save_bar_velocity_session($1::jsonb, $2::jsonb) as id', [JSON.stringify(s), JSON.stringify(r)]); }
beforeAll(async () => {
 db = new PGlite();
 await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 create table profiles(id uuid primary key, role text);
 insert into profiles values ('${athlete}', 'athlete');
 select set_config('request.jwt.claim.sub', '${athlete}', false);`);
 await db.exec(readFileSync('supabase/migrations/20260219165041_20260219_create_bar_velocity_system.sql', 'utf8'));
 const file = readdirSync('supabase/migrations').find(n => n.endsWith('_vbt_data_integrity.sql'));
 if (!file) throw new Error('Atomic save migration is missing');
 // Isolated in-memory PostgreSQL only; never connects to a Supabase project.
 await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
 await db.exec('grant usage on schema public, auth to authenticated; grant select, insert, update, delete on public.bar_velocity_sessions, public.bar_velocity_reps to authenticated; grant select on profiles to authenticated; set role authenticated;');
}, 30000);
afterAll(async()=>{await db?.close();});
it('5 SQL: failed reps roll back header; retry/update is idempotent, with no synthetic manual data', async () => {
 await expect(save(session,[{...rep, rep_number:null}])).rejects.toThrow();
 expect((await db.query('select * from bar_velocity_sessions')).rows).toHaveLength(0);
 const first = await save(session,[rep]);
 await save(session,[rep]);
 const updated = await save({...session, notes:'edited'},[{...rep, peak_velocity_ms:9, velocity_samples:[{velocityMs:9}]}]);
 expect(updated.rows).toEqual(first.rows);
 expect((await db.query('select * from bar_velocity_sessions')).rows).toHaveLength(1);
 const reps = await db.query('select * from bar_velocity_reps');
 expect(reps.rows).toHaveLength(1);
 expect(reps.rows[0]).toMatchObject({source:'manual',peak_velocity_ms:null,velocity_samples:null});
 expect((await db.query('select notes, peak_velocity_ms from bar_velocity_sessions')).rows[0]).toMatchObject({notes:'edited',peak_velocity_ms:null});
 // Failure while replacing an existing session must preserve its previous data.
 await expect(save({...session, notes:'must roll back'},[{...rep,rep_number:null}])).rejects.toThrow();
 expect((await db.query('select notes from bar_velocity_sessions')).rows[0]).toMatchObject({notes:'edited'});
 expect((await db.query('select * from bar_velocity_reps')).rows).toHaveLength(1);
});
it('5 SQL: one athlete cannot overwrite another athlete session', async () => {
 await db.exec("select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false)");
 await expect(save(session,[rep])).rejects.toThrow();
 await db.exec(`select set_config('request.jwt.claim.sub', '${athlete}', false)`);
 expect((await db.query('select notes from bar_velocity_sessions')).rows[0]).toMatchObject({notes:'edited'});
});
it('5 SQL: video retry preserves measurements and null metadata', async () => {
 const s={...session,client_session_id:'44444444-4444-4444-8444-444444444444',source:'video',fps:60};
 const r={...rep,source:'video',peak_velocity_ms:.9,concentric_duration_ms:600,displacement_mm:400,velocity_samples:[{timeMs:1,velocityMs:.6,positionPx:10}],timestamps_ms:[1]};
 await save(s,[r]); await save(s,[r]);
 const rows=await db.query("select r.* from bar_velocity_reps r join bar_velocity_sessions s on s.id=r.session_id where s.client_session_id=$1",[s.client_session_id]);
 expect(rows.rows).toHaveLength(1);
 expect(rows.rows[0]).toMatchObject({source:'video',peak_velocity_ms:'0.900',concentric_duration_ms:600,velocity_samples:r.velocity_samples});
});
