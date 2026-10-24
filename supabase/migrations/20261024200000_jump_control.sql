alter table public.cmj_sessions
  add column if not exists client_session_id uuid,
  add column if not exists jump_type text,
  add column if not exists load_kg numeric,
  add column if not exists box_cm numeric,
  add column if not exists hpo_m numeric,
  add column if not exists side text,
  add column if not exists effective_fps numeric,
  add column if not exists source text,
  add column if not exists algorithm_version text;

alter table public.cmj_jumps
  add column if not exists onset_ms numeric,
  add column if not exists takeoff_ms numeric,
  add column if not exists landing_ms numeric,
  add column if not exists contact_ms numeric,
  add column if not exists takeoff_vel_ms numeric,
  add column if not exists rsi numeric,
  add column if not exists rsi_mod numeric,
  add column if not exists flags jsonb,
  add column if not exists reasons jsonb,
  add column if not exists source text;

update public.cmj_sessions set jump_type = 'cmj' where jump_type is null;
create unique index if not exists cmj_sessions_client_session_id_uidx on public.cmj_sessions(client_session_id) where client_session_id is not null;

create or replace function public.save_jump_session(p_session jsonb)
returns uuid language plpgsql security invoker as $$
declare v_session_id uuid;
begin
  insert into public.cmj_sessions (client_session_id, athlete_id, session_date, protocol, body_mass_kg, load_kg, box_cm, hpo_m, side, effective_fps, source, algorithm_version, notes, jump_type, total_jumps)
  values ((p_session->>'client_session_id')::uuid, (p_session->>'athlete_id')::uuid, coalesce((p_session->>'session_date')::date,current_date), 'standard', (p_session->>'body_mass_kg')::numeric, nullif(p_session->>'load_kg','')::numeric, nullif(p_session->>'box_cm','')::numeric, nullif(p_session->>'hpo_m','')::numeric, nullif(p_session->>'side',''), (p_session->>'effective_fps')::numeric, p_session->>'source', p_session->>'algorithm_version', p_session->>'notes', p_session->>'jump_type', jsonb_array_length(coalesce(p_session->'attempts','[]'::jsonb)))
  on conflict (client_session_id) do update set updated_at=now() returning id into v_session_id;
  delete from public.cmj_jumps where session_id = v_session_id;
  insert into public.cmj_jumps (session_id,jump_number,flight_time_ms,jump_height_cm,takeoff_frame,landing_frame,fps,is_valid,onset_ms,takeoff_ms,landing_ms,contact_ms,takeoff_vel_ms,rsi,rsi_mod,flags,reasons,source)
  select v_session_id,(a->>'index')::integer,coalesce((a->>'flight_ms')::numeric,0),coalesce((a->>'height_cm')::numeric,0),null,null,(p_session->>'effective_fps')::integer,true,(a->'marks'->>'onsetMs')::numeric,(a->'marks'->>'takeoffMs')::numeric,(a->'marks'->>'landingMs')::numeric,(a->'marks'->>'contactMs')::numeric,(a->>'takeoff_vel_ms')::numeric,(a->>'rsi')::numeric,(a->>'rsi_mod')::numeric,a->'flags',a->'reasons',a->>'source' from jsonb_array_elements(coalesce(p_session->'attempts','[]'::jsonb)) a;
  return v_session_id;
end; $$;
