/*
  # Programs 3, 4, 5: Athletic Performance, Lower Body Hypertrophy, Upper Body Push-Pull
*/

-- ============================================================
-- PROGRAM 3: ATHLETIC PERFORMANCE (8 weeks, Intermediate)
-- ============================================================
WITH prog3 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Athletic Performance',
    'Programa integral de 8 semanas para atletas que compiten. Fuerza, potencia, velocidad y resistencia en un sistema integrado.',
    'Combina los pilares del rendimiento atlético: fuerza máxima en los patrones fundamentales, desarrollo pliométrico, trabajo de velocidad (COD + sprint) y acondicionamiento metabólico. Diseñado para que cada cualidad potencie a las demás. Ideal para deportistas de campo: fútbol, básquet, rugby, atletismo de velocidad.',
    8, false, 89.00, 'USD', true, 'Athletic', 'Intermediate', 'General'
  ) RETURNING id
),
w1_p3 AS (
  INSERT INTO program_weeks (program_product_id, week_number, title, description)
  SELECT id, 1, 'Semana 1 - Evaluación y Base', 'Semana de evaluación de patrones. Cargas al 65%.'
  FROM prog3 RETURNING id
),
d1_p3 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Fuerza Inferior + Velocidad', 'Squat + Sprint técnico.' FROM w1_p3 RETURNING id),
d2_p3 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - Potencia Superior + COD', 'Push-Pull + cambio de dirección.' FROM w1_p3 RETURNING id),
d3_p3 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Hinge + Pliometría + Acondicionamiento', 'Deadlift + saltos + sled.' FROM w1_p3 RETURNING id),
d4_p3 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 4, 'Día D - Unilateral + Movilidad Activa', 'Trabajo unilateral y recuperación activa.' FROM w1_p3 RETURNING id),

p3d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, 'a77a48c4-d237-4db9-b303-c8b383ee0318', 1, 1, 1, NULL, 0, 'MOVILIDAD | Full Body Foam Roll: 5 min completo.' FROM d1_p3),
p3d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, '6ff055c9-f022-4186-a9c7-c49a9b53e088', 2, 2, 8, NULL, 30, 'MOVILIDAD | Spiderman Hip Lift: 2x8/lado.' FROM d1_p3),
p3d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, '2dbe960f-f49f-4e50-b749-48b5feb7c7e5', 3, 2, 20, NULL, 30, 'WARM-UP VELOCIDAD | High Knees: 2x20m.' FROM d1_p3),
p3d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, '184cc371-8f22-47ff-9d2f-fa82bca1c263', 4, 2, 20, NULL, 30, 'WARM-UP VELOCIDAD | Bounding: 2x20m.' FROM d1_p3),
p3d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p3.id, '1416bca1-de27-49f6-bdb3-f07f8626916c', 5, 4, 5, 70, '21X0', 210, 'PRINCIPAL | BB Back Squat: 4x5 @ 70% 1RM.' FROM d1_p3),
p3d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, '11292e88-df40-4f26-90cf-b00caf7432cd', 6, 4, 4, '10X0', 150, 'PLIOMETRÍA | Box Jump ECC-CON: 4x4. Contramovement rápido.' FROM d1_p3),
p3d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, '4a0b8308-742d-410b-8162-d92e9b73ef1c', 7, 4, 1, NULL, 150, 'VELOCIDAD | Flying 5m: 4x1. 100% esfuerzo. Descanso completo.' FROM d1_p3),
p3d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p3.id, '4d8f4f46-8956-472a-907e-7f027c1cadd3', 8, 3, 10, 65, '21X0', 90, 'SECUNDARIO | BB Reverse Lunge: 3x10/lado @ 65%.' FROM d1_p3),
p3d1e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p3.id, 'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea', 9, 3, 45, NULL, 60, 'ACCESORIO | Plank: 3x45s.' FROM d1_p3),

p3d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p3.id, '75ccc7d2-5007-447e-97a5-0ffde93d6a99', 1, 2, 10, NULL, 30, 'MOVILIDAD | Bear Crawl T-Spine: 2x10.' FROM d2_p3),
p3d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p3.id, '796d9467-b7e0-4033-b9da-3949e0f58ae9', 2, 3, 15, NULL, 30, 'ACTIVACIÓN | Band Pullapart: 3x15.' FROM d2_p3),
p3d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p3.id, '8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9', 3, 5, 4, 72, '10X0', 240, 'PRINCIPAL | BB Push Press: 5x4 @ 72%.' FROM d2_p3),
p3d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p3.id, '1795cac2-5d03-42d1-bb3a-dc1974553e87', 4, 4, 6, 68, '21X0', 150, 'PRINCIPAL | BB High Bench Pull: 4x6 @ 68%.' FROM d2_p3),
p3d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p3.id, '8f6441c6-18ae-4f77-9c2c-2488cc377e8d', 5, 4, 5, NULL, 120, 'VELOCIDAD/COD | COD 45°: 4x5/lado. Técnica perfecta.' FROM d2_p3),
p3d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p3.id, '67920661-ac0e-42f7-80f8-51e3c81dec36', 6, 3, 10, 65, '21X0', 90, 'SECUNDARIO | BB Incline Press: 3x10 @ 65%.' FROM d2_p3),
p3d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p3.id, 'a19d976a-b26d-463b-8ac0-027496cd0077', 7, 3, 10, '21X0', 90, 'SECUNDARIO | Banded Pull Up: 3x10.' FROM d2_p3),
p3d2e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p3.id, 'e3e44f5c-daf0-45c3-808a-4f61a14bd710', 8, 3, 15, NULL, 45, 'ACCESORIO | Cable Face Pull: 3x15.' FROM d2_p3),

p3d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p3.id, '7842d641-78a4-4a78-b2e6-af9468a0bb6a', 1, 2, 8, NULL, 30, 'MOVILIDAD | Hip Flexor Stretch: 30s/lado.' FROM d3_p3),
p3d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p3.id, '29ebe870-4048-45ab-aa17-4923f25bf096', 2, 4, 5, 75, '10X0', 240, 'PRINCIPAL | BB Deadlift: 4x5 @ 75%.' FROM d3_p3),
p3d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p3.id, '49967d6e-4ec5-4d1a-8c28-13e8469a61f4', 3, 4, 4, '10X0', 180, 'PLIOMETRÍA | Depth Jump: 4x4. Mínimo tiempo contacto.' FROM d3_p3),
p3d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p3.id, 'ffab85e8-6d6d-416f-843b-4c410bf33975', 4, 4, 20, NULL, 120, 'ACOND | Sled Push Straight Arms: 4x20m. Intensidad alta.' FROM d3_p3),
p3d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p3.id, '00f1de91-dc49-44a5-b488-430c10620a4e', 5, 3, 8, 65, '31X0', 120, 'SECUNDARIO | BB RDL: 3x8 @ 65%.' FROM d3_p3),
p3d3e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p3.id, '25d98192-5707-4db8-ae84-b264eed1394d', 6, 3, 8, '4010', 90, 'ACCESORIO | AB GHR ECC: 3x8.' FROM d3_p3),

p3d4e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p3.id, '312e51df-2ef3-4d8b-92ec-ed10324e70a6', 1, 2, 5, NULL, 60, 'MOVILIDAD ACTIVA | Animal Flow: 2 rondas 5 min.' FROM d4_p3),
p3d4e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p3.id, '34f92f77-93d0-42d2-8e7d-e90db24b5a07', 2, 2, 10, NULL, 30, 'MOVILIDAD | 90-90 Transitions: 10/lado.' FROM d4_p3),
p3d4e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d4_p3.id, '235f203c-033b-4792-b269-126342c95f75', 3, 4, 8, 65, '21X0', 90, 'UNILATERAL | BB RFESS: 4x8/lado @ 65%.' FROM d4_p3),
p3d4e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d4_p3.id, '47a40c9c-e85e-49b8-a6a8-904ae9622c07', 4, 3, 10, 55, '31X0', 90, 'UNILATERAL | BB SL RDL: 3x10/lado @ 55%.' FROM d4_p3),
p3d4e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p3.id, '30880e43-59f3-4c99-9c7c-0d090e4fd288', 5, 3, 4, '10X0', 120, 'UNILATERAL | SL CMJ: 3x4/pierna. MAX explosividad.' FROM d4_p3),
p3d4e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p3.id, '2b98f704-b156-4ad9-a88a-ee989d488fb8', 6, 1, 1, NULL, 0, 'VUELTA A LA CALMA | Lower Body Stretching 2: 10 min.' FROM d4_p3),

-- ============================================================
-- PROGRAM 4: LOWER BODY HYPERTROPHY (8 weeks, Intermediate)
-- ============================================================
prog4 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Lower Body Hypertrophy',
    'Programa de 8 semanas para maximizar la hipertrofia de cuádriceps, glúteos e isquiotibiales. Volumen alto con progresión ondulada.',
    'Programa especializado en desarrollo muscular del tren inferior. Combina rangos de fuerza (4-6 reps) con rangos de hipertrofia (8-15 reps) en ondulación semanal. Énfasis en tiempo bajo tensión, variaciones excéntricas y ejercicios de aislamiento para glúteo medio, aductores y gemelos. Diseñado para atletas que buscan masa muscular funcional.',
    8, false, 59.00, 'USD', true, 'Hypertrophy', 'Intermediate', 'General'
  ) RETURNING id
),
w1_p4 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Fase de Acumulación', 'Semana 1: Volumen alto, cargas moderadas. Squat 65%, Hip Thrust 70%.' FROM prog4 RETURNING id),
d1_p4 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Quad Dominante', 'Squat + Lunge + Sissy. Mayor foco en cuádriceps.' FROM w1_p4 RETURNING id),
d2_p4 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - Glúteo + Isquio', 'Hip Thrust + RDL + GHR.' FROM w1_p4 RETURNING id),
d3_p4 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Quad + Glúteo Completo', 'Front Squat + Unilateral + Hip Thrust.' FROM w1_p4 RETURNING id),

p4d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p4.id, 'bea5efea-e188-4052-966b-9c7a30452d0a', 1, 2, 10, NULL, 30, 'MOVILIDAD | Shin Box: 10/lado.' FROM d1_p4),
p4d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p4.id, '78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f', 2, 2, 8, NULL, 30, 'MOVILIDAD | Deep Squat T-Spine: 2x8.' FROM d1_p4),
p4d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p4.id, 'd0ae6c95-91ca-49d1-aad4-bb0f5b56fb82', 3, 3, 20, NULL, 30, 'ACTIVACIÓN | Banded Hip Abduction: 3x20.' FROM d1_p4),
p4d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p4.id, '1416bca1-de27-49f6-bdb3-f07f8626916c', 4, 5, 8, 65, '32X0', 150, 'PRINCIPAL | BB Back Squat: 5x8 @ 65%. Tempo 3-2-X-0.' FROM d1_p4),
p4d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p4.id, '116a15ae-0584-4dea-ba5d-896e706ac376', 5, 3, 4, '10X0', 120, 'PLIOMETRÍA | CMJ Arms Free: 3x4. Potencia, reset entre reps.' FROM d1_p4),
p4d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p4.id, '235f203c-033b-4792-b269-126342c95f75', 6, 4, 10, 60, '31X0', 90, 'SECUNDARIO | BB RFESS: 4x10/lado @ 60%.' FROM d1_p4),
p4d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p4.id, '393184f6-9f87-43d1-8e54-513dec6878f9', 7, 3, 12, 50, '21X0', 75, 'SECUNDARIO | BB Forward Lunge: 3x12/lado @ 50%.' FROM d1_p4),
p4d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p4.id, '13d9ba3f-05f1-42ef-a415-221649fb784b', 8, 4, 15, '4010', 60, 'ACCESORIO | Sissy Squat ECC: 4x15. Excéntrico 4 seg.' FROM d1_p4),
p4d1e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p4.id, '4988efed-6a7d-4504-a01a-e0f9c787c4f7', 9, 3, 20, NULL, 45, 'ACCESORIO | Banded X-Walk: 3x20 pasos/lado.' FROM d1_p4),

p4d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p4.id, '912eaf9a-817f-42e3-b36b-78ff9a358cdd', 1, 2, 10, NULL, 30, 'MOVILIDAD | Hip Airplane: 10/lado.' FROM d2_p4),
p4d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p4.id, '7842d641-78a4-4a78-b2e6-af9468a0bb6a', 2, 2, 8, NULL, 30, 'MOVILIDAD | Hip Flexor Stretch: 30s/lado.' FROM d2_p4),
p4d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p4.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 3, 5, 10, 70, '21X1', 120, 'PRINCIPAL | BB Hip Thrust: 5x10 @ 70%. Pausa 1s arriba, aprieta glúteo.' FROM d2_p4),
p4d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p4.id, '00f1de91-dc49-44a5-b488-430c10620a4e', 4, 4, 10, 62, '32X0', 120, 'PRINCIPAL | BB RDL: 4x10 @ 62%. Foco isquio-glúteo.' FROM d2_p4),
p4d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p4.id, 'fe7279f3-fa0d-4036-b858-9e8a9908bedd', 5, 3, 8, NULL, 90, 'PLIOMETRÍA | Ankle Jumps: 3x8. Tobillo rígido, mínimo contacto.' FROM d2_p4),
p4d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p4.id, '10386efc-e932-42e5-b3b4-406fa22926f4', 6, 4, 12, 55, '21X1', 75, 'SECUNDARIO | BB SL Hip Thrust: 4x12/lado @ 55%.' FROM d2_p4),
p4d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p4.id, '47a40c9c-e85e-49b8-a6a8-904ae9622c07', 7, 3, 12, 52, '31X0', 75, 'SECUNDARIO | BB SL RDL: 3x12/lado @ 52%.' FROM d2_p4),
p4d2e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p4.id, '25d98192-5707-4db8-ae84-b264eed1394d', 8, 4, 10, '4010', 90, 'ACCESORIO | AB GHR ECC Drop: 4x10. Control total.' FROM d2_p4),
p4d2e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p4.id, '39e0d568-e550-4175-bdb2-0bc8b2f770bd', 9, 2, 8, NULL, 0, 'VUELTA | Glute Stretch: 30s/lado x2.' FROM d2_p4),

p4d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p4.id, '34f92f77-93d0-42d2-8e7d-e90db24b5a07', 1, 2, 10, NULL, 30, 'MOVILIDAD | 90-90 Transitions: 10/lado.' FROM d3_p4),
p4d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p4.id, '1d6e32b2-1685-41f1-947b-9974f529696e', 2, 5, 8, 65, '32X0', 150, 'PRINCIPAL | BB Front Squat: 5x8 @ 65%. Mayor foco en quad.' FROM d3_p4),
p4d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p4.id, 'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc', 3, 3, 5, '10X0', 120, 'PLIOMETRÍA | Box Jump CON: 3x5.' FROM d3_p4),
p4d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p4.id, '235f203c-033b-4792-b269-126342c95f75', 4, 4, 12, 58, '31X0', 90, 'SECUNDARIO | BB RFESS: 4x12/lado @ 58%.' FROM d3_p4),
p4d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p4.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 5, 3, 15, 60, '21X1', 75, 'SECUNDARIO | BB Hip Thrust: 3x15 @ 60%. Quema final.' FROM d3_p4),
p4d3e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p4.id, '4988efed-6a7d-4504-a01a-e0f9c787c4f7', 6, 3, 20, NULL, 45, 'ACCESORIO | Banded X-Walk: 20 pasos/lado.' FROM d3_p4),
p4d3e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p4.id, '28b038f4-adbe-4c6e-bf57-2f5014bdfa59', 7, 1, 1, NULL, 0, 'VUELTA | Lower Body Stretching: 10 min completo.' FROM d3_p4),

-- ============================================================
-- PROGRAM 5: UPPER BODY PUSH-PULL (8 weeks, Intermediate)
-- ============================================================
prog5 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Upper Body Push-Pull',
    'Programa de 8 semanas con split push-pull para desarrollar fuerza y masa en tren superior. Equilibrio horizontal/vertical.',
    'Sistema Push-Pull de 4 días por semana. Cada sesión push equilibra empuje horizontal y vertical. Cada sesión pull equilibra tirón horizontal y vertical. Énfasis en salud de hombro: rotadores externos, manguito, escápula. Progresión lineal las primeras 4 semanas, luego ondulada. Incluye trabajo de explosividad con Press Throw y Bench Throw.',
    8, false, 59.00, 'USD', true, 'Hypertrophy', 'Intermediate', 'General'
  ) RETURNING id
),
w1_p5 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Establecimiento', 'Cargas al 60-65%. Foco en técnica y activación.' FROM prog5 RETURNING id),
d1_p5 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Push A - Horizontal + Vertical', 'Bench Press + Military Press.' FROM w1_p5 RETURNING id),
d2_p5 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Pull A - Horizontal + Vertical', 'Bent Over Row + Pull Up.' FROM w1_p5 RETURNING id),
d3_p5 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Push B - Incline + Push Press', 'Incline + explosividad.' FROM w1_p5 RETURNING id),
d4_p5 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 4, 'Pull B - High Pull + OH Pull', 'Remo alto + dominadas.' FROM w1_p5 RETURNING id),

p5d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p5.id, '02fbbcfa-dc66-4185-8895-dc9547e8cbe1', 1, 2, 10, NULL, 30, 'MOVILIDAD | Side Lying Shoulder Openers: 10/lado.' FROM d1_p5),
p5d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p5.id, '796d9467-b7e0-4033-b9da-3949e0f58ae9', 2, 3, 20, NULL, 30, 'ACTIVACIÓN | Band Pullapart: 3x20.' FROM d1_p5),
p5d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p5.id, '63e02cc4-3b48-4ed2-8b01-a2041c18a874', 3, 2, 15, NULL, 30, 'ACTIVACIÓN | Shoulder ER Lift Offs: 2x15.' FROM d1_p5),
p5d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p5.id, '25ecd04b-dc05-453a-aa1e-ff658f46df49', 4, 5, 6, 65, '31X0', 180, 'PRINCIPAL | BB Bench Press: 5x6 @ 65%.' FROM d1_p5),
p5d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p5.id, '4fcee15d-0b8f-4d48-b025-224f6393cda8', 5, 4, 6, 62, '31X0', 180, 'PRINCIPAL | BB Military Press: 4x6 @ 62%.' FROM d1_p5),
p5d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p5.id, '67920661-ac0e-42f7-80f8-51e3c81dec36', 6, 3, 10, 60, '21X0', 90, 'SECUNDARIO | BB Incline Press: 3x10 @ 60%.' FROM d1_p5),
p5d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p5.id, '6ee0bf32-d938-45e8-96ef-18af48057342', 7, 3, 10, 60, '21X0', 90, 'SECUNDARIO | BB Seated OH Press: 3x10 @ 60%.' FROM d1_p5),
p5d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p5.id, '3821470f-c663-40dd-85b3-6f0d6a0a5df3', 8, 3, 12, '20X0', 60, 'ACCESORIO | BW Dips: 3x12.' FROM d1_p5),
p5d1e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p5.id, '192d3181-13ef-45da-84d6-a41c579e6994', 9, 2, 12, NULL, 0, 'VUELTA | Lying Supine Shoulder Flexion: 2x12.' FROM d1_p5),

p5d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p5.id, '633d2809-03da-4c71-a62a-66d37ec3d1a0', 1, 2, 10, NULL, 30, 'MOVILIDAD | Stick Shoulder Climb: 10.' FROM d2_p5),
p5d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p5.id, '796d9467-b7e0-4033-b9da-3949e0f58ae9', 2, 3, 20, NULL, 30, 'ACTIVACIÓN | Band Pullapart: 3x20.' FROM d2_p5),
p5d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p5.id, '62dcfe55-6604-4584-b029-fb37a2c0de3b', 3, 5, 6, 65, '31X0', 180, 'PRINCIPAL | BB Bent Over Row: 5x6 @ 65%.' FROM d2_p5),
p5d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p5.id, 'a19d976a-b26d-463b-8ac0-027496cd0077', 4, 4, 6, '21X0', 180, 'PRINCIPAL | Banded Pull Up: 4x6. Máximo rango.' FROM d2_p5),
p5d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p5.id, '94e11eb6-9fee-4116-a873-0001d041027b', 5, 3, 12, '21X0', 90, 'SECUNDARIO | Cable Low Row: 3x12. Retracción final.' FROM d2_p5),
p5d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p5.id, '1795cac2-5d03-42d1-bb3a-dc1974553e87', 6, 3, 10, 62, '21X0', 90, 'SECUNDARIO | BB High Bench Pull: 3x10 @ 62%.' FROM d2_p5),
p5d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p5.id, 'e3e44f5c-daf0-45c3-808a-4f61a14bd710', 7, 4, 15, NULL, 45, 'ACCESORIO | Cable Face Pull: 4x15.' FROM d2_p5),
p5d2e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p5.id, '02fbbcfa-dc66-4185-8895-dc9547e8cbe1', 8, 2, 12, NULL, 0, 'VUELTA | Side Lying Shoulder Openers: 2x12.' FROM d2_p5),

p5d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p5.id, '67920661-ac0e-42f7-80f8-51e3c81dec36', 1, 5, 6, 67, '31X0', 180, 'PRINCIPAL | BB Incline Press: 5x6 @ 67%.' FROM d3_p5),
p5d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p5.id, '8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9', 2, 4, 5, 68, '10X0', 210, 'PRINCIPAL | BB Push Press: 4x5 @ 68%. Explosivo.' FROM d3_p5),
p5d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p5.id, '0a9ae1b9-8615-47a7-a451-435cdc1266ba', 3, 3, 10, 60, '21X0', 90, 'SECUNDARIO | BB Floor Press: 3x10 @ 60%.' FROM d3_p5),
p5d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p5.id, '3821470f-c663-40dd-85b3-6f0d6a0a5df3', 4, 3, 15, '20X0', 60, 'ACCESORIO | BW Dips: 3x15.' FROM d3_p5),
p5d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p5.id, '4ee31d87-a9dd-4445-92eb-30f3f53ce598', 5, 3, 20, NULL, 45, 'ACCESORIO | Band OH Pullapart: 3x20.' FROM d3_p5),

p5d4e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d4_p5.id, '1795cac2-5d03-42d1-bb3a-dc1974553e87', 1, 5, 6, 68, '31X0', 180, 'PRINCIPAL | BB High Bench Pull: 5x6 @ 68%.' FROM d4_p5),
p5d4e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p5.id, 'a19d976a-b26d-463b-8ac0-027496cd0077', 2, 5, 6, '21X0', 180, 'PRINCIPAL | Banded Pull Up: 5x6.' FROM d4_p5),
p5d4e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p5.id, '94e11eb6-9fee-4116-a873-0001d041027b', 3, 3, 15, '21X0', 75, 'SECUNDARIO | Cable Low Row: 3x15.' FROM d4_p5),
p5d4e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p5.id, 'e3e44f5c-daf0-45c3-808a-4f61a14bd710', 4, 4, 15, NULL, 45, 'ACCESORIO | Cable Face Pull: 4x15.' FROM d4_p5),
p5d4e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p5.id, '657bc923-7c36-4000-aace-91b9201d39ec', 5, 3, 20, NULL, 60, 'ACCESORIO | Active Hang: 3x20s. Escápulas activas.' FROM d4_p5)

SELECT 'Programs 3, 4, 5 inserted' AS result;
