-- Prepared only: do not deploy the client until this migration is reviewed/applied.
-- NULL source is reserved for legacy rows whose acquisition mode is unknown.
alter table public.bar_velocity_sessions
  add column client_session_id uuid,
  add column source text check (source in ('manual', 'video'));
create unique index bar_velocity_sessions_client_session_id_key
  on public.bar_velocity_sessions(client_session_id);
alter table public.bar_velocity_reps
  add column source text check (source in ('manual', 'video'));

-- Existing measurement columns are already nullable in the original schema.
create or replace function public.save_bar_velocity_session(p_session jsonb, p_reps jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_athlete uuid := auth.uid();
  v_client uuid := (p_session->>'client_session_id')::uuid;
  v_source text := p_session->>'source';
  v_id uuid;
  v_reps jsonb;
begin
  if v_athlete is null or v_client is null then
    raise exception 'Authenticated athlete and client_session_id required';
  end if;
  if v_source is null or v_source not in ('manual', 'video') then
    raise exception 'Invalid acquisition source';
  end if;
  if jsonb_typeof(p_reps) is distinct from 'array' then
    raise exception 'Reps must be an array';
  end if;
  if jsonb_array_length(p_reps) = 0 then raise exception 'At least one rep required'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_reps) r
    where (r->>'source') is distinct from v_source
       or not coalesce((r->>'is_valid')::boolean, false)
       or not coalesce((r->>'mean_concentric_velocity_ms')::numeric > 0
                   and (r->>'mean_concentric_velocity_ms')::numeric <= 5, false)
  ) then raise exception 'Invalid repetition'; end if;

  -- Defend against synthetic fields even if a caller bypasses the UI.
  select jsonb_agg(case when v_source = 'manual' then r || jsonb_build_object(
    'peak_velocity_ms', null, 'mean_eccentric_velocity_ms', null,
    'concentric_duration_ms', null, 'eccentric_duration_ms', null,
    'displacement_mm', null, 'estimated_power_w', null,
    'velocity_samples', null, 'timestamps_ms', null) else r end)
    into v_reps from jsonb_array_elements(p_reps) r;

  insert into public.bar_velocity_sessions (
    athlete_id, client_session_id, source, session_date, exercise_name, load_kg,
    total_reps, peak_velocity_ms, mean_concentric_velocity_ms,
    velocity_loss_pct, estimated_power_w, fps, notes
  ) select v_athlete, v_client, v_source,
      coalesce((p_session->>'session_date')::date, current_date),
      coalesce(p_session->>'exercise_name', ''), (p_session->>'load_kg')::numeric,
      count(*), max(r.peak_velocity_ms), avg(r.mean_concentric_velocity_ms),
      -- Preserve the existing first-to-last loss definition in this scope.
      ((array_agg(r.mean_concentric_velocity_ms order by r.rep_number))[1]
       - (array_agg(r.mean_concentric_velocity_ms order by r.rep_number desc))[1])
       / (array_agg(r.mean_concentric_velocity_ms order by r.rep_number))[1] * 100,
      avg(r.estimated_power_w),
      case when v_source = 'video' then (p_session->>'fps')::integer else null end,
      nullif(p_session->>'notes', '')
    from jsonb_to_recordset(v_reps) as r(rep_number integer, peak_velocity_ms numeric,
      mean_concentric_velocity_ms numeric, estimated_power_w numeric)
    on conflict (client_session_id) do update set
      source = excluded.source, session_date = excluded.session_date,
      exercise_name = excluded.exercise_name, load_kg = excluded.load_kg,
      total_reps = excluded.total_reps, peak_velocity_ms = excluded.peak_velocity_ms,
      mean_concentric_velocity_ms = excluded.mean_concentric_velocity_ms,
      velocity_loss_pct = excluded.velocity_loss_pct, estimated_power_w = excluded.estimated_power_w,
      fps = excluded.fps, notes = excluded.notes, updated_at = now()
    returning id into v_id;

  -- Upsert obtains the session row lock, serializing concurrent retries.
  -- RLS enforces ownership for insert, update, select, and delete.
  delete from public.bar_velocity_reps where session_id = v_id;
  insert into public.bar_velocity_reps (
    session_id, rep_number, source, mean_concentric_velocity_ms, peak_velocity_ms,
    mean_eccentric_velocity_ms, concentric_duration_ms, eccentric_duration_ms,
    displacement_mm, estimated_power_w, velocity_samples, timestamps_ms, is_valid
  ) select v_id, r.rep_number, v_source, r.mean_concentric_velocity_ms, r.peak_velocity_ms,
      r.mean_eccentric_velocity_ms, r.concentric_duration_ms, r.eccentric_duration_ms,
      r.displacement_mm, r.estimated_power_w, nullif(r.velocity_samples, 'null'::jsonb),
      nullif(r.timestamps_ms, 'null'::jsonb), r.is_valid
    from jsonb_to_recordset(v_reps) as r(
      rep_number integer, mean_concentric_velocity_ms numeric, peak_velocity_ms numeric,
      mean_eccentric_velocity_ms numeric, concentric_duration_ms integer,
      eccentric_duration_ms integer, displacement_mm numeric, estimated_power_w numeric,
      velocity_samples jsonb, timestamps_ms jsonb, is_valid boolean);
  return v_id;
end;
$$;
revoke all on function public.save_bar_velocity_session(jsonb, jsonb) from public, anon;
grant execute on function public.save_bar_velocity_session(jsonb, jsonb) to authenticated;
