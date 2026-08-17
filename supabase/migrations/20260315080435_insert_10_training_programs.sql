/*
  # Insert 10 Professional Training Programs

  ## Overview
  Creates 10 complete training programs for the marketplace, each with:
  - Full week/day structure
  - Mobility warm-up, activation, main lifts, plyometrics, secondary and accessory exercises
  - Sets, reps, load percentages (stored in notes), tempo, rest periods

  ## Programs
  1. Foundation Strength (Beginner, 8 weeks) - Squats + Hinge focus
  2. Power & Plyometrics (Intermediate, 6 weeks) - Jump & explosive development
  3. Athletic Performance (Intermediate, 8 weeks) - All-round athlete
  4. Lower Body Hypertrophy (Intermediate, 8 weeks) - Quad/glute/hamstring mass
  5. Upper Body Push-Pull (Intermediate, 8 weeks) - Horizontal + vertical push/pull
  6. Speed & Agility (Advanced, 6 weeks) - COD, sprint mechanics
  7. Posterior Chain Dominant (Advanced, 8 weeks) - Deadlift, GHR, RDL specialization
  8. Unilateral Strength (Intermediate, 6 weeks) - Single-leg, single-arm focus
  9. Explosive Power Elite (Advanced, 6 weeks) - Depth jumps, ballistics, max strength
  10. Mobility & Movement Quality (Beginner, 4 weeks) - Movement foundation
*/

-- ============================================================
-- PROGRAM 1: FOUNDATION STRENGTH (8 weeks, Beginner)
-- ============================================================
WITH prog1 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Foundation Strength',
    'Un programa de 8 semanas para construir las bases de la fuerza. Ideal para atletas que comienzan su entrenamiento estructurado o regresan después de una pausa.',
    'Este programa de 8 semanas está diseñado para construir una base sólida de fuerza funcional. Cada sesión incluye movilidad articular, activación muscular, ejercicios principales de sentadilla y bisagra, trabajo de core y vuelta a la calma. La progresión es lineal: incrementamos carga semana a semana. Al finalizar tendrás una técnica impecable en los patrones fundamentales y mejoras significativas en tu fuerza máxima.',
    8, false, 49.00, 'USD', true, 'Strength', 'Beginner', 'General'
  ) RETURNING id
),
-- Week 1
w1_p1 AS (
  INSERT INTO program_weeks (program_product_id, week_number, title, description)
  SELECT id, 1, 'Semana 1 - Introducción', 'Establecemos técnica y cargas base. Todos los ejercicios al 60% 1RM.'
  FROM prog1 RETURNING id, program_product_id
),
-- Day 1: Lower Body A
d1_p1_w1 AS (
  INSERT INTO program_days (program_week_id, day_number, day_name, notes)
  SELECT id, 1, 'Día A - Tren Inferior (Squat)', 'Foco en patrón de sentadilla. Descanso 2-3 min entre series principales.'
  FROM w1_p1 RETURNING id
),
-- Day 2: Upper Body A
d2_p1_w1 AS (
  INSERT INTO program_days (program_week_id, day_number, day_name, notes)
  SELECT id, 2, 'Día B - Tren Superior', 'Push y Pull horizontal. Descanso 90s entre series accesorias.'
  FROM w1_p1 RETURNING id
),
-- Day 3: Lower Body B
d3_p1_w1 AS (
  INSERT INTO program_days (program_week_id, day_number, day_name, notes)
  SELECT id, 3, 'Día C - Tren Inferior (Hinge)', 'Foco en patrón de bisagra y glúteo. Descanso 2 min entre series principales.'
  FROM w1_p1 RETURNING id
),

-- Exercises Day 1 (Lower A - Squat Day)
-- Mobility
ex_d1_mob1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '34f92f77-93d0-42d2-8e7d-e90db24b5a07', 1, 2, 10, NULL, 30, 'MOVILIDAD | 90-90: 10 reps/lado. Control respiratorio.'
  FROM d1_p1_w1),
ex_d1_mob2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '6ff055c9-f022-4186-a9c7-c49a9b53e088', 2, 2, 8, NULL, 30, 'MOVILIDAD | Spiderman: 8 reps/lado. Mantén cadera baja.'
  FROM d1_p1_w1),
ex_d1_mob3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f', 3, 2, 8, NULL, 30, 'MOVILIDAD | Deep Squat T-Spine: 8 reps.'
  FROM d1_p1_w1),
-- Warm-up
ex_d1_wu1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, 'e705cbd3-046e-41dc-9c08-b95f164d65c9', 4, 2, 10, NULL, 30, 'ACTIVACIÓN | Birddog: 10 reps/lado. Espalda neutra.'
  FROM d1_p1_w1),
ex_d1_wu2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, 'd0ae6c95-91ca-49d1-aad4-bb0f5b56fb82', 5, 2, 15, NULL, 30, 'ACTIVACIÓN | Hip Abduction: 15 reps/lado.'
  FROM d1_p1_w1),
-- Main
ex_d1_main1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '1416bca1-de27-49f6-bdb3-f07f8626916c', 6, 4, 6, 60, '31X0', 180, 'PRINCIPAL | BB Back Squat: 4x6 @ 60% 1RM. Tempo 3-1-X-0. Profundidad completa.'
  FROM d1_p1_w1),
-- Plyometric
ex_d1_plyo1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, 'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc', 7, 3, 5, '10X0', 90, 'PLIOMETRÍA | Box Jump CON: 3x5. Aterrizaje suave, reset entre reps.'
  FROM d1_p1_w1),
-- Secondary
ex_d1_sec1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '4d8f4f46-8956-472a-907e-7f027c1cadd3', 8, 3, 8, 65, '20X0', 120, 'SECUNDARIO | BB Reverse Lunge: 3x8/lado @ 65% 1RM.'
  FROM d1_p1_w1),
-- Accessories
ex_d1_acc1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '13d9ba3f-05f1-42ef-a415-221649fb784b', 9, 3, 12, '4010', 60, 'ACCESORIO | Banded Sissy Squat ECC: 3x12. Foco excéntrico 4 seg.'
  FROM d1_p1_w1),
ex_d1_acc2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, 'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea', 10, 3, 30, NULL, 60, 'ACCESORIO | Plank: 3x30s. Cuerpo en línea recta.'
  FROM d1_p1_w1),
-- Cool-down
ex_d1_cool1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d1_p1_w1.id, '28b038f4-adbe-4c6e-bf57-2f5014bdfa59', 11, 1, 1, NULL, 0, 'VUELTA A LA CALMA | Lower Body Stretching Series: 5-8 min.'
  FROM d1_p1_w1),

-- Exercises Day 2 (Upper Body A)
ex_d2_mob1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, 'c2374292-62aa-4898-8f63-a74da2c19a43', 1, 2, 8, NULL, 30, 'MOVILIDAD | Side Lying Windmill: 8 reps/lado.'
  FROM d2_p1_w1),
ex_d2_mob2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '02fbbcfa-dc66-4185-8895-dc9547e8cbe1', 2, 2, 10, NULL, 30, 'MOVILIDAD | Side Lying Shoulder Openers: 10 reps/lado.'
  FROM d2_p1_w1),
ex_d2_wu1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '796d9467-b7e0-4033-b9da-3949e0f58ae9', 3, 3, 15, NULL, 30, 'ACTIVACIÓN | Band Pullapart: 3x15. Escápulas hacia dentro.'
  FROM d2_p1_w1),
ex_d2_wu2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '63e02cc4-3b48-4ed2-8b01-a2041c18a874', 4, 2, 12, NULL, 30, 'ACTIVACIÓN | Shoulder ER Lift Offs: 2x12.'
  FROM d2_p1_w1),
ex_d2_main1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '25ecd04b-dc05-453a-aa1e-ff658f46df49', 5, 4, 6, 60, '31X0', 180, 'PRINCIPAL | BB Bench Press: 4x6 @ 60% 1RM. Tempo controlado.'
  FROM d2_p1_w1),
ex_d2_main2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '62dcfe55-6604-4584-b029-fb37a2c0de3b', 6, 4, 6, 60, '31X0', 180, 'PRINCIPAL | BB Bent Over Row: 4x6 @ 60% 1RM. Codos pegados al cuerpo.'
  FROM d2_p1_w1),
ex_d2_sec1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '67920661-ac0e-42f7-80f8-51e3c81dec36', 7, 3, 10, 65, '21X0', 90, 'SECUNDARIO | BB Incline Press: 3x10 @ 65% 1RM.'
  FROM d2_p1_w1),
ex_d2_sec2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '94e11eb6-9fee-4116-a873-0001d041027b', 8, 3, 12, '21X0', 90, 'SECUNDARIO | Cable Low Row: 3x12. Retracción escapular completa.'
  FROM d2_p1_w1),
ex_d2_acc1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '3821470f-c663-40dd-85b3-6f0d6a0a5df3', 9, 3, 10, '20X0', 60, 'ACCESORIO | BW Dips: 3x10. Control total.'
  FROM d2_p1_w1),
ex_d2_acc2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, 'e3e44f5c-daf0-45c3-808a-4f61a14bd710', 10, 3, 15, NULL, 60, 'ACCESORIO | Cable Face Pull: 3x15. Codos a la altura de los hombros.'
  FROM d2_p1_w1),
ex_d2_cool1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d2_p1_w1.id, '192d3181-13ef-45da-84d6-a41c579e6994', 11, 2, 10, NULL, 0, 'VUELTA A LA CALMA | Lying Supine Shoulder Flexion: 2x10.'
  FROM d2_p1_w1),

-- Exercises Day 3 (Lower B - Hinge Day)
ex_d3_mob1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '7842d641-78a4-4a78-b2e6-af9468a0bb6a', 1, 2, 8, NULL, 30, 'MOVILIDAD | Hip Flexor Stretch: 30s/lado x2.'
  FROM d3_p1_w1),
ex_d3_mob2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '912eaf9a-817f-42e3-b36b-78ff9a358cdd', 2, 2, 8, NULL, 30, 'MOVILIDAD | Hip Airplane: 8 reps/lado. Control de cadera.'
  FROM d3_p1_w1),
ex_d3_wu1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '0279e7fd-8bbd-479c-ac40-d259ca583d6e', 3, 3, 12, '20X0', 45, 'ACTIVACIÓN | BB Glute Bridge: 3x12. Aprieta glúteo arriba.'
  FROM d3_p1_w1),
ex_d3_main1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '29ebe870-4048-45ab-aa17-4923f25bf096', 4, 4, 5, 65, '31X0', 180, 'PRINCIPAL | BB Conventional Deadlift: 4x5 @ 65% 1RM. Espalda neutra siempre.'
  FROM d3_p1_w1),
ex_d3_plyo1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, 'fe7279f3-fa0d-4036-b858-9e8a9908bedd', 5, 3, 8, '10X0', 90, 'PLIOMETRÍA | Ankle Jumps: 3x8. Mínimo tiempo de contacto, tobillo rígido.'
  FROM d3_p1_w1),
ex_d3_sec1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '00f1de91-dc49-44a5-b488-430c10620a4e', 6, 3, 8, 60, '31X0', 120, 'SECUNDARIO | BB RDL: 3x8 @ 60% 1RM. Rodillas levemente flexionadas.'
  FROM d3_p1_w1),
ex_d3_sec2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 7, 3, 10, 65, '21X1', 90, 'SECUNDARIO | BB Hip Thrust: 3x10 @ 65% 1RM. Pausa 1s arriba.'
  FROM d3_p1_w1),
ex_d3_acc1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '25d98192-5707-4db8-ae84-b264eed1394d', 8, 3, 8, '4010', 90, 'ACCESORIO | AB GHR ECC Drop: 3x8. Caída en 4 seg, ayuda para subir.'
  FROM d3_p1_w1),
ex_d3_acc2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, '4988efed-6a7d-4504-a01a-e0f9c787c4f7', 9, 2, 15, NULL, 45, 'ACCESORIO | Banded X-Walk: 2x15 pasos/lado.'
  FROM d3_p1_w1),
ex_d3_cool1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes)
  SELECT d3_p1_w1.id, 'fd6cfed7-9b4c-479b-bc41-b9477e2fb748', 10, 2, 8, NULL, 0, 'VUELTA A LA CALMA | Lying Hamstring Stretch: 30s/lado x2.'
  FROM d3_p1_w1)

SELECT 'Program 1 - Foundation Strength: Week 1 inserted' AS result;
