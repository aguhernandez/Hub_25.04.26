alter table public.bar_velocity_sessions
  add column if not exists exercise_id text,
  add column if not exists variant text;

create index if not exists bar_velocity_sessions_exercise_id_idx
  on public.bar_velocity_sessions (exercise_id);

update public.bar_velocity_sessions
set exercise_id = case
  when lower(trim(exercise_name)) like '%romanian deadlift%'
    or lower(trim(exercise_name)) like '%peso muerto rumano%'
    or lower(trim(exercise_name)) like '%rdl%' then 'romanian_deadlift'
  when lower(trim(exercise_name)) like '%sentadilla%'
    or lower(trim(exercise_name)) like '%squat%' then 'squat'
  when lower(trim(exercise_name)) like '%bench%'
    or lower(trim(exercise_name)) like '%press banca%' then 'bench_press'
  when lower(trim(exercise_name)) like '%overhead press%'
    or lower(trim(exercise_name)) like '%press militar%'
    or lower(trim(exercise_name)) like '%ohp%' then 'overhead_press'
  when lower(trim(exercise_name)) like '%deadlift%'
    or lower(trim(exercise_name)) like '%peso muerto%' then 'deadlift'
  when lower(trim(exercise_name)) like '%hip thrust%'
    or lower(trim(exercise_name)) like '%empuje de cadera%' then 'hip_thrust'
  else 'other'
end
where exercise_id is null;

update public.bar_velocity_sessions
set variant = exercise_name
where variant is null;
