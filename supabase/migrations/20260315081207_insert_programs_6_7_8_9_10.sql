/*
  # Programs 6-10: Speed & Agility, Posterior Chain, Unilateral Strength, Explosive Power Elite, Mobility & Movement
*/

-- ============================================================
-- PROGRAM 6: SPEED & AGILITY (6 weeks, Advanced)
-- ============================================================
WITH prog6 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Speed & Agility',
    'Programa de 6 semanas para optimizar la velocidad lineal y el cambio de dirección. Para atletas de deportes de equipo y velocistas.',
    'Sistema de desarrollo de velocidad en 6 semanas. Combina mecánica de sprint, aceleración, velocidad máxima y cambios de dirección con fuerza específica para el sprint (squat, hip thrust, sled). Progresión desde trabajo técnico a alta intensidad. Ideal para futbolistas, rugbiers, basquetbolistas y corredores.',
    6, false, 79.00, 'USD', true, 'Speed', 'Advanced', 'General'
  ) RETURNING id
),
w1_p6 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Mecánica y Aceleración', 'Técnica de sprint y aceleración. Fuerza al 72%.' FROM prog6 RETURNING id),
d1_p6 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Aceleración + Fuerza', 'Sprint técnico + Squat pesado.' FROM w1_p6 RETURNING id),
d2_p6 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - COD + Potencia Tren Superior', 'Cambio de dirección + Push.' FROM w1_p6 RETURNING id),
d3_p6 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Velocidad Máxima + Sled', 'Máxima velocidad + acondicionamiento sled.' FROM w1_p6 RETURNING id),

p6d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, '1787ae3d-1cf9-4fa8-9ae3-13b7128702b5', 1, 2, 12, NULL, 30, 'WARM-UP | Leg Swings: 12/dirección/pierna.' FROM d1_p6),
p6d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, 'f0cb7722-7b7c-49a3-b51f-404f05472098', 2, 3, 10, NULL, 30, 'WARM-UP | Thigh Switch Single: 3x10/lado.' FROM d1_p6),
p6d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, '92941c07-7418-497a-a1ee-39f1eb82e8df', 3, 3, 5, NULL, 30, 'WARM-UP | Kneeling First Step: 3x5/lado.' FROM d1_p6),
p6d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, '2dbe960f-f49f-4e50-b749-48b5feb7c7e5', 4, 2, 20, NULL, 30, 'ACTIVACIÓN | High Knees: 2x20m. Frecuencia alta.' FROM d1_p6),
p6d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, '6bbc5bb4-c9dd-4172-b6aa-4e350105a73c', 5, 5, 20, NULL, 150, 'VELOCIDAD | Sled March: 5x20m. Posición de aceleración, empuje completo de cadera.' FROM d1_p6),
p6d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p6.id, '1416bca1-de27-49f6-bdb3-f07f8626916c', 6, 4, 4, 80, '20X0', 240, 'FUERZA | BB Back Squat: 4x4 @ 80%. Explosive concentric.' FROM d1_p6),
p6d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, '116a15ae-0584-4dea-ba5d-896e706ac376', 7, 4, 4, '10X0', 180, 'PLIOMETRÍA | CMJ Arms Free: 4x4. MAX height.' FROM d1_p6),
p6d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p6.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 8, 3, 8, 72, '21X1', 90, 'SECUNDARIO | BB Hip Thrust: 3x8 @ 72%.' FROM d1_p6),
p6d1e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p6.id, '25d98192-5707-4db8-ae84-b264eed1394d', 9, 3, 8, '4010', 90, 'ACCESORIO | AB GHR ECC: 3x8.' FROM d1_p6),

p6d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p6.id, '6ff055c9-f022-4186-a9c7-c49a9b53e088', 1, 2, 8, NULL, 30, 'MOVILIDAD | Spiderman Hip Lift: 2x8/lado.' FROM d2_p6),
p6d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p6.id, '8f6441c6-18ae-4f77-9c2c-2488cc377e8d', 2, 5, 5, NULL, 120, 'COD | COD 45°: 5x5/lado. Técnica de penúltimo paso.' FROM d2_p6),
p6d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p6.id, 'aa125f91-259f-4659-ac8f-7127a8b5b157', 3, 4, 4, NULL, 120, 'COD | COD 90°: 4x4/lado.' FROM d2_p6),
p6d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p6.id, 'b3ad9e30-2791-413b-9213-2613834c4faf', 4, 4, 4, NULL, 120, 'COD | Heiden to COD: 4x4/lado. Explosión horizontal a cambio.' FROM d2_p6),
p6d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p6.id, '8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9', 5, 4, 4, 75, '10X0', 210, 'FUERZA | BB Push Press: 4x4 @ 75%.' FROM d2_p6),
p6d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p6.id, '62dcfe55-6604-4584-b029-fb37a2c0de3b', 6, 4, 6, 70, '21X0', 150, 'SECUNDARIO | BB Bent Over Row: 4x6 @ 70%.' FROM d2_p6),
p6d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p6.id, 'e3e44f5c-daf0-45c3-808a-4f61a14bd710', 7, 3, 15, NULL, 45, 'ACCESORIO | Cable Face Pull: 3x15.' FROM d2_p6),

p6d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p6.id, '184cc371-8f22-47ff-9d2f-fa82bca1c263', 1, 3, 30, NULL, 60, 'WARM-UP | Bounding: 3x30m.' FROM d3_p6),
p6d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p6.id, 'aebe2deb-31ff-40e7-8aaa-cb33b92e76b6', 2, 6, 10, NULL, 180, 'VELOCIDAD | Flying 10m: 6x10m. MAX velocidad. Descanso completo.' FROM d3_p6),
p6d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p6.id, 'b5124f03-26c8-4f96-8a0e-243528b78992', 3, 5, 20, NULL, 150, 'ACOND | Sled Acceleration Push: 5x20m.' FROM d3_p6),
p6d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p6.id, '29ebe870-4048-45ab-aa17-4923f25bf096', 4, 4, 4, 78, '10X0', 240, 'FUERZA | BB Deadlift: 4x4 @ 78%.' FROM d3_p6),
p6d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p6.id, '49967d6e-4ec5-4d1a-8c28-13e8469a61f4', 5, 4, 4, '10X0', 180, 'PLIOMETRÍA | Depth Jump: 4x4.' FROM d3_p6),
p6d3e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p6.id, '28b038f4-adbe-4c6e-bf57-2f5014bdfa59', 6, 1, 1, NULL, 0, 'VUELTA | Lower Body Stretching: 8 min.' FROM d3_p6),

-- ============================================================
-- PROGRAM 7: POSTERIOR CHAIN DOMINANT (8 weeks, Advanced)
-- ============================================================
prog7 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Posterior Chain Dominant',
    'Programa avanzado de 8 semanas con énfasis en isquiotibiales, glúteos y espalda baja. Deadlift, GHR y RDL como pilares.',
    'Para atletas avanzados que buscan fortalecer la cadena posterior: isquiotibiales, glúteos, erectores y trapecio inferior. Progresión en Deadlift hasta 90%+ 1RM, múltiples variaciones de GHR (ECC Drop, perturbaciones), RDL unilateral y bilateral, y Hip Thrust pesado. Incluye trabajo preventivo con banded hamstring tantrum y trabajo de movilidad de cadera profunda.',
    8, false, 89.00, 'USD', true, 'Strength', 'Advanced', 'General'
  ) RETURNING id
),
w1_p7 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Evaluación Cadena Posterior', 'Establecemos cargas. Deadlift 75%, Hip Thrust 78%.' FROM prog7 RETURNING id),
d1_p7 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Deadlift + RDL', 'Bisagra doble bilateral.' FROM w1_p7 RETURNING id),
d2_p7 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - Hip Thrust + GHR', 'Glúteo + isquiotibiales dominante.' FROM w1_p7 RETURNING id),
d3_p7 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Unilateral Posterior + Squat', 'SL RDL + SL Hip Thrust + Squat como accesorio.' FROM w1_p7 RETURNING id),

p7d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p7.id, '912eaf9a-817f-42e3-b36b-78ff9a358cdd', 1, 2, 10, NULL, 30, 'MOVILIDAD | Hip Airplane: 10/lado.' FROM d1_p7),
p7d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p7.id, '6ff055c9-f022-4186-a9c7-c49a9b53e088', 2, 2, 8, NULL, 30, 'MOVILIDAD | Spiderman Hip Lift: 8/lado.' FROM d1_p7),
p7d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p7.id, '29ebe870-4048-45ab-aa17-4923f25bf096', 3, 5, 4, 80, '10X0', 270, 'PRINCIPAL | BB Deadlift: 5x4 @ 80%. Setup perfecto cada rep, reset.' FROM d1_p7),
p7d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p7.id, 'ec385ba7-819c-4fdc-96a0-6e8c938c672b', 4, 3, 6, '10X0', 120, 'PLIOMETRÍA | Ankle Jumps Forward: 3x6.' FROM d1_p7),
p7d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p7.id, '00f1de91-dc49-44a5-b488-430c10620a4e', 5, 4, 6, 72, '32X0', 150, 'SECUNDARIO | BB RDL: 4x6 @ 72%. ECC 3 seg.' FROM d1_p7),
p7d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p7.id, '129194a5-d039-4c6f-8ae5-242403d7aab2', 6, 4, 5, 75, '4010', 150, 'SECUNDARIO | BB RDL ECC Drop: 4x5 @ 75%. DROP en 4s.' FROM d1_p7),
p7d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p7.id, '6cb281ba-32ba-43ba-93bd-d0aadb09004c', 7, 3, 10, 60, '31X0', 90, 'ACCESORIO | BB Good Morning: 3x10 @ 60%.' FROM d1_p7),
p7d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p7.id, 'fd6cfed7-9b4c-479b-bc41-b9477e2fb748', 8, 2, 8, NULL, 0, 'VUELTA | Lying Hamstring Stretch: 30s/lado x2.' FROM d1_p7),

p7d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p7.id, '7842d641-78a4-4a78-b2e6-af9468a0bb6a', 1, 2, 8, NULL, 30, 'MOVILIDAD | Hip Flexor Stretch: 30s/lado.' FROM d2_p7),
p7d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p7.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 2, 5, 6, 78, '21X2', 180, 'PRINCIPAL | BB Hip Thrust: 5x6 @ 78%. Pausa 2s arriba.' FROM d2_p7),
p7d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p7.id, '116a15ae-0584-4dea-ba5d-896e706ac376', 3, 3, 4, '10X0', 150, 'PLIOMETRÍA | CMJ: 3x4 MAX.' FROM d2_p7),
p7d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p7.id, '25d98192-5707-4db8-ae84-b264eed1394d', 4, 5, 8, '5010', 150, 'PRINCIPAL | AB GHR ECC Drop: 5x8. ECC 5 seg. Nivel avanzado.' FROM d2_p7),
p7d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p7.id, '13bc2ad1-5c52-4346-b9a6-4ec24780cede', 5, 3, 10, NULL, 90, 'ACCESORIO | AB GHR Perturbations: 3x10.' FROM d2_p7),
p7d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p7.id, '10386efc-e932-42e5-b3b4-406fa22926f4', 6, 4, 10, 65, '21X2', 90, 'ACCESORIO | BB SL Hip Thrust: 4x10/lado @ 65%.' FROM d2_p7),
p7d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p7.id, '39e0d568-e550-4175-bdb2-0bc8b2f770bd', 7, 2, 8, NULL, 0, 'VUELTA | Glute Stretch: 30s/lado x2.' FROM d2_p7),

p7d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p7.id, '47a40c9c-e85e-49b8-a6a8-904ae9622c07', 1, 5, 6, 62, '31X0', 120, 'PRINCIPAL | BB SL RDL: 5x6/lado @ 62%.' FROM d3_p7),
p7d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p7.id, '10386efc-e932-42e5-b3b4-406fa22926f4', 2, 4, 8, 62, '21X2', 90, 'PRINCIPAL | BB SL Hip Thrust: 4x8/lado @ 62%.' FROM d3_p7),
p7d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p7.id, '30880e43-59f3-4c99-9c7c-0d090e4fd288', 3, 4, 4, '10X0', 150, 'PLIOMETRÍA | SL CMJ: 4x4/pierna.' FROM d3_p7),
p7d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p7.id, '1416bca1-de27-49f6-bdb3-f07f8626916c', 4, 3, 6, 72, '21X0', 150, 'ACCESORIO | BB Back Squat: 3x6 @ 72%.' FROM d3_p7),
p7d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p7.id, '4988efed-6a7d-4504-a01a-e0f9c787c4f7', 5, 3, 20, NULL, 45, 'ACCESORIO | Banded X-Walk: 3x20/lado.' FROM d3_p7),

-- ============================================================
-- PROGRAM 8: UNILATERAL STRENGTH (6 weeks, Intermediate)
-- ============================================================
prog8 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Unilateral Strength',
    'Programa de 6 semanas focalizado en ejercicios unilaterales de tren inferior y superior. Corrige asimetrías y mejora estabilidad.',
    'Programa especializado en trabajo unilateral para corregir desequilibrios musculares, mejorar la estabilidad lumbopélvica y desarrollar fuerza específica para deportes. RFESS, SL RDL, SL Hip Thrust como pilares del tren inferior. SA Press y SA Row en el tren superior. Incluye trabajo de single-leg plyometrics.',
    6, false, 59.00, 'USD', true, 'Strength', 'Intermediate', 'General'
  ) RETURNING id
),
w1_p8 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Evaluación Unilateral', 'Detectamos desequilibrios. Cargas al 60%.' FROM prog8 RETURNING id),
d1_p8 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Unilateral Inferior Squat', 'RFESS + Lunge.' FROM w1_p8 RETURNING id),
d2_p8 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - Unilateral Inferior Hinge', 'SL RDL + SL Hip Thrust.' FROM w1_p8 RETURNING id),
d3_p8 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Unilateral Superior + Core', 'SA Press + SA Row + Core.' FROM w1_p8 RETURNING id),

p8d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p8.id, '34f92f77-93d0-42d2-8e7d-e90db24b5a07', 1, 2, 10, NULL, 30, 'MOVILIDAD | 90-90 Transitions: 10/lado.' FROM d1_p8),
p8d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p8.id, 'bea5efea-e188-4052-966b-9c7a30452d0a', 2, 2, 10, NULL, 30, 'MOVILIDAD | Shin Box: 10/lado.' FROM d1_p8),
p8d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p8.id, '235f203c-033b-4792-b269-126342c95f75', 3, 5, 6, 65, '31X0', 150, 'PRINCIPAL | BB RFESS: 5x6/lado @ 65%.' FROM d1_p8),
p8d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p8.id, '30880e43-59f3-4c99-9c7c-0d090e4fd288', 4, 4, 4, '10X0', 120, 'PLIOMETRÍA | SL CMJ: 4x4/pierna.' FROM d1_p8),
p8d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p8.id, '4d8f4f46-8956-472a-907e-7f027c1cadd3', 5, 4, 8, 62, '21X0', 90, 'SECUNDARIO | BB Reverse Lunge: 4x8/lado @ 62%.' FROM d1_p8),
p8d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p8.id, '393184f6-9f87-43d1-8e54-513dec6878f9', 6, 3, 10, 55, '21X0', 75, 'SECUNDARIO | BB Forward Lunge: 3x10/lado @ 55%.' FROM d1_p8),
p8d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p8.id, '13d9ba3f-05f1-42ef-a415-221649fb784b', 7, 3, 15, '4010', 60, 'ACCESORIO | Sissy Squat ECC: 3x15.' FROM d1_p8),

p8d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p8.id, '47a40c9c-e85e-49b8-a6a8-904ae9622c07', 1, 5, 6, 58, '31X0', 120, 'PRINCIPAL | BB SL RDL: 5x6/lado @ 58%.' FROM d2_p8),
p8d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p8.id, '10386efc-e932-42e5-b3b4-406fa22926f4', 2, 5, 8, 60, '21X1', 120, 'PRINCIPAL | BB SL Hip Thrust: 5x8/lado @ 60%.' FROM d2_p8),
p8d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p8.id, 'c095bea7-11f5-4970-a2d0-fa5fcce7d6a5', 3, 3, 4, '10X0', 120, 'PLIOMETRÍA | DB SL Box Jump CON: 3x4/pierna.' FROM d2_p8),
p8d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p8.id, '621e8619-63a1-488a-82c4-2831f3a78634', 4, 3, 10, '30X0', 90, 'SECUNDARIO | AB SL Elevated Supine Hamstring IsoHold: 3x10s/lado.' FROM d2_p8),
p8d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p8.id, '4988efed-6a7d-4504-a01a-e0f9c787c4f7', 5, 3, 20, NULL, 45, 'ACCESORIO | Banded X-Walk: 20/lado.' FROM d2_p8),

p8d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p8.id, '75ccc7d2-5007-447e-97a5-0ffde93d6a99', 1, 2, 8, NULL, 30, 'MOVILIDAD | Bear Crawl T-Spine: 2x8.' FROM d3_p8),
p8d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p8.id, '25ecd04b-dc05-453a-aa1e-ff658f46df49', 2, 4, 6, 65, '31X0', 180, 'PRINCIPAL | BB Bench Press: 4x6 @ 65%.' FROM d3_p8),
p8d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p8.id, '62dcfe55-6604-4584-b029-fb37a2c0de3b', 3, 4, 6, 65, '31X0', 180, 'PRINCIPAL | BB Bent Over Row: 4x6 @ 65%.' FROM d3_p8),
p8d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p8.id, '94e11eb6-9fee-4116-a873-0001d041027b', 4, 3, 12, '21X0', 75, 'SECUNDARIO | Cable Low Row: 3x12.' FROM d3_p8),
p8d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p8.id, 'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea', 5, 4, 45, NULL, 60, 'CORE | Plank: 4x45s.' FROM d3_p8),
p8d3e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p8.id, 'e705cbd3-046e-41dc-9c08-b95f164d65c9', 6, 3, 12, NULL, 45, 'CORE | Birddog: 3x12/lado.' FROM d3_p8),

-- ============================================================
-- PROGRAM 9: EXPLOSIVE POWER ELITE (6 weeks, Advanced)
-- ============================================================
prog9 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Explosive Power Elite',
    'Programa avanzado de 6 semanas para atletas de élite. Máxima fuerza + pliometría de alta intensidad + velocidad reactiva.',
    'El programa más exigente de la plataforma. Combina cargas de 85-95% 1RM en squat y deadlift con depth jumps intensivos, bounds máximos y sprint reactivo. Requiere experiencia sólida en los ejercicios base. Semana de descarga en la semana 4. Al finalizar esperamos mejoras de 5-10% en CMJ y velocidad de sprint.',
    6, false, 99.00, 'USD', true, 'Power', 'Advanced', 'General'
  ) RETURNING id
),
w1_p9 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Potencia Máxima', 'Squat 82%, Deadlift 80%. Pliometría de alta intensidad.' FROM prog9 RETURNING id),
d1_p9 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Máxima Fuerza Inferior', 'Heavy Squat + Depth Jump.' FROM w1_p9 RETURNING id),
d2_p9 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - Potencia Superior', 'Push Press pesado + reactividad.' FROM w1_p9 RETURNING id),
d3_p9 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Deadlift + Velocidad', 'Heavy Deadlift + Flying Sprint.' FROM w1_p9 RETURNING id),

p9d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p9.id, 'a77a48c4-d237-4db9-b303-c8b383ee0318', 1, 1, 1, NULL, 0, 'MOVILIDAD | Full Body Foam Roll: 8 min.' FROM d1_p9),
p9d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p9.id, '78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f', 2, 2, 8, NULL, 30, 'MOVILIDAD | Deep Squat T-Spine: 2x8.' FROM d1_p9),
p9d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p9.id, '184cc371-8f22-47ff-9d2f-fa82bca1c263', 3, 2, 20, NULL, 60, 'WARM-UP | Bounding: 2x20m. Activación.' FROM d1_p9),
p9d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p9.id, '1416bca1-de27-49f6-bdb3-f07f8626916c', 4, 6, 3, 85, '10X0', 300, 'PRINCIPAL | BB Back Squat: 6x3 @ 85%. MÁXIMA velocidad concéntrica.' FROM d1_p9),
p9d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p9.id, '49967d6e-4ec5-4d1a-8c28-13e8469a61f4', 5, 5, 5, '10X0', 240, 'PLIOMETRÍA | Depth Jump: 5x5. Mínimo tiempo contacto absoluto.' FROM d1_p9),
p9d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p9.id, '41f3434c-3667-43d4-ba29-e2a71bc1766c', 6, 3, 4, 75, '4010', 180, 'SECUNDARIO | BB Back Squat ECC Tempo: 3x4 @ 75%. ECC 4s.' FROM d1_p9),
p9d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p9.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 7, 3, 6, 80, '21X1', 120, 'ACCESORIO | BB Hip Thrust: 3x6 @ 80%.' FROM d1_p9),

p9d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p9.id, '8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9', 1, 6, 3, 82, '10X0', 300, 'PRINCIPAL | BB Push Press: 6x3 @ 82%.' FROM d2_p9),
p9d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p9.id, '1e6832c8-4b6b-46d9-b139-d705ad4adb44', 2, 5, 4, '10X0', 180, 'PLIOMETRÍA | Approach Vertical Jump: 5x4. Run-up + MAX jump.' FROM d2_p9),
p9d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p9.id, '62dcfe55-6604-4584-b029-fb37a2c0de3b', 3, 4, 5, 78, '21X0', 180, 'PRINCIPAL | BB Bent Over Row: 4x5 @ 78%.' FROM d2_p9),
p9d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p9.id, '1795cac2-5d03-42d1-bb3a-dc1974553e87', 4, 3, 6, 75, '21X0', 120, 'SECUNDARIO | BB High Bench Pull: 3x6 @ 75%.' FROM d2_p9),
p9d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p9.id, 'e3e44f5c-daf0-45c3-808a-4f61a14bd710', 5, 4, 15, NULL, 45, 'ACCESORIO | Cable Face Pull: 4x15.' FROM d2_p9),

p9d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p9.id, '29ebe870-4048-45ab-aa17-4923f25bf096', 1, 6, 3, 85, '10X0', 300, 'PRINCIPAL | BB Deadlift: 6x3 @ 85%. Reset completo.' FROM d3_p9),
p9d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p9.id, 'aebe2deb-31ff-40e7-8aaa-cb33b92e76b6', 2, 6, 10, NULL, 240, 'VELOCIDAD | Flying 10m: 6x. 100%. Descanso total.' FROM d3_p9),
p9d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p9.id, '129194a5-d039-4c6f-8ae5-242403d7aab2', 3, 4, 4, 78, '4010', 180, 'SECUNDARIO | BB RDL ECC Drop: 4x4 @ 78%.' FROM d3_p9),
p9d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p9.id, '25d98192-5707-4db8-ae84-b264eed1394d', 4, 4, 8, '5010', 150, 'ACCESORIO | AB GHR ECC Drop: 4x8. ECC 5s.' FROM d3_p9),
p9d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p9.id, '28b038f4-adbe-4c6e-bf57-2f5014bdfa59', 5, 1, 1, NULL, 0, 'VUELTA | Lower Body Stretching: 10 min.' FROM d3_p9),

-- ============================================================
-- PROGRAM 10: MOBILITY & MOVEMENT QUALITY (4 weeks, Beginner)
-- ============================================================
prog10 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Mobility & Movement Quality',
    'Programa de 4 semanas para mejorar la calidad de movimiento, la movilidad articular y la conciencia corporal. Base de todo rendimiento.',
    'La movilidad es la base de todo rendimiento deportivo. Este programa de 4 semanas aborda las restricciones más comunes: cadera, tobillo, columna torácica y hombro. Combina trabajo de movilidad activa, estiramientos dinámicos y patrones de movimiento básicos. Ideal como base antes de iniciar un programa de fuerza, o como complemento durante fases de alta carga.',
    4, false, 29.00, 'USD', true, 'Mobility', 'Beginner', 'General'
  ) RETURNING id
),
w1_p10 AS (INSERT INTO program_weeks (program_product_id, week_number, title, description) SELECT id, 1, 'Semana 1 - Cadera y Tobillo', 'Trabajamos las cadenas de movilidad inferior. Foco en restricciones de cadera y tobillo.' FROM prog10 RETURNING id),
d1_p10 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 1, 'Día A - Movilidad Cadera Completa', 'Rotación interna, externa, flexión y extensión.' FROM w1_p10 RETURNING id),
d2_p10 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 2, 'Día B - Columna Torácica y Hombro', 'Apertura de caja torácica y movilidad glenohumeral.' FROM w1_p10 RETURNING id),
d3_p10 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 3, 'Día C - Tobillo + Patrones Básicos', 'Dorsiflexión + squat + bisagra con calidad.' FROM w1_p10 RETURNING id),
d4_p10 AS (INSERT INTO program_days (program_week_id, day_number, day_name, notes) SELECT id, 4, 'Día D - Flujo Completo', 'Sesión completa de movilidad e integración de movimiento.' FROM w1_p10 RETURNING id),

p10d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, 'a77a48c4-d237-4db9-b303-c8b383ee0318', 1, 1, 1, NULL, 0, 'PREPARACIÓN | Full Body Foam Roll: 5 min. Enfasis en IT band, cuádriceps, cadera.' FROM d1_p10),
p10d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, '34f92f77-93d0-42d2-8e7d-e90db24b5a07', 2, 3, 10, NULL, 30, 'MOVILIDAD | 90-90 Transitions: 3x10/lado. Mantén espalda recta.' FROM d1_p10),
p10d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, 'bea5efea-e188-4052-966b-9c7a30452d0a', 3, 3, 10, NULL, 30, 'MOVILIDAD | Shin Box Mobility: 3x10.' FROM d1_p10),
p10d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, 'b09fd3a6-5b05-496f-a655-7bf97ee024d0', 4, 3, 8, NULL, 30, 'MOVILIDAD | Shin Box to Lunge: 3x8.' FROM d1_p10),
p10d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, '912eaf9a-817f-42e3-b36b-78ff9a358cdd', 5, 3, 8, NULL, 30, 'MOVILIDAD | Hip Airplane: 3x8/lado. Pelvis estable.' FROM d1_p10),
p10d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, '20113459-c74f-44cd-8c62-0763a7dd845d', 6, 3, 8, NULL, 30, 'MOVILIDAD | Hip Hurdler: 3x8/lado.' FROM d1_p10),
p10d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, '2fd2a788-4f6d-447b-bb6b-07f7f057c596', 7, 3, 8, NULL, 30, 'MOVILIDAD | Hip Star: 3x8/lado.' FROM d1_p10),
p10d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, '6ff055c9-f022-4186-a9c7-c49a9b53e088', 8, 3, 8, NULL, 30, 'MOVILIDAD | Spiderman Hip Lift: 3x8/lado.' FROM d1_p10),
p10d1e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p10.id, '7842d641-78a4-4a78-b2e6-af9468a0bb6a', 9, 3, 8, NULL, 0, 'CIERRE | Hip Flexor Stretch: 45s/lado x3.' FROM d1_p10),

p10d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, '75ccc7d2-5007-447e-97a5-0ffde93d6a99', 1, 3, 8, NULL, 30, 'MOVILIDAD | Bear Crawl T-Spine: 3x8/lado.' FROM d2_p10),
p10d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, 'c2374292-62aa-4898-8f63-a74da2c19a43', 2, 3, 8, NULL, 30, 'MOVILIDAD | Side Lying Windmill: 3x8/lado.' FROM d2_p10),
p10d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, '02fbbcfa-dc66-4185-8895-dc9547e8cbe1', 3, 3, 10, NULL, 30, 'MOVILIDAD | Side Lying Shoulder Openers: 3x10/lado.' FROM d2_p10),
p10d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, '63e02cc4-3b48-4ed2-8b01-a2041c18a874', 4, 3, 15, NULL, 30, 'MOVILIDAD | Shoulder ER Lift Offs: 3x15.' FROM d2_p10),
p10d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, '78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f', 5, 3, 8, NULL, 30, 'MOVILIDAD | Deep Squat T-Spine: 3x8.' FROM d2_p10),
p10d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, '633d2809-03da-4c71-a62a-66d37ec3d1a0', 6, 3, 10, NULL, 30, 'MOVILIDAD | Stick Shoulder Climb: 3x10.' FROM d2_p10),
p10d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p10.id, '192d3181-13ef-45da-84d6-a41c579e6994', 7, 3, 10, NULL, 0, 'CIERRE | Lying Supine Shoulder Flexion: 3x10.' FROM d2_p10),

p10d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, '8b4c5d1a-2dfe-4df8-bb0c-cd6af87317bd', 1, 3, 10, NULL, 30, 'MOVILIDAD | 3-Way Half Kneeling Dorsiflexion: 3x10/lado.' FROM d3_p10),
p10d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, '983523ab-0e5d-470f-aa9d-2f93439667d7', 2, 3, 8, NULL, 30, 'MOVILIDAD | Heel Sit: 3x30s.' FROM d3_p10),
p10d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, '60737b2c-45d7-4eb0-b510-d1a66df8450d', 3, 3, 8, NULL, 30, 'MOVILIDAD | Shin Box to Squat: 3x8.' FROM d3_p10),
p10d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, '3a9bd909-0571-48ad-b372-8242eae841f2', 4, 3, 8, NULL, 30, 'MOVILIDAD | Squat Internal Rotations: 3x8.' FROM d3_p10),
p10d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, 'e705cbd3-046e-41dc-9c08-b95f164d65c9', 5, 3, 10, NULL, 30, 'PATRÓN | Birddog: 3x10/lado. Espalda neutra, no rotar.' FROM d3_p10),
p10d3e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, 'b5052fa0-143e-4a14-aa26-23a4e8937431', 6, 3, 10, NULL, 30, 'PATRÓN | Quadruped Hip Mobilizations: 3x10.' FROM d3_p10),
p10d3e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p10.id, '6c5b749b-a959-43cd-a16e-38d3e2200d8c', 7, 3, 8, NULL, 0, 'CIERRE | Quad Stretch: 45s/lado x3.' FROM d3_p10),

p10d4e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, '312e51df-2ef3-4d8b-92ec-ed10324e70a6', 1, 2, 5, NULL, 60, 'FLUJO | Animal Flow: 2 rondas de 5 min.' FROM d4_p10),
p10d4e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, '0bc42325-802a-4683-9c3b-92d148f23f2f', 2, 3, 20, NULL, 30, 'FLUJO | Bear Crawl: 3x20m.' FROM d4_p10),
p10d4e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, 'f822cce4-9f32-4fc3-8ae3-dc5e822b9584', 3, 3, 20, NULL, 30, 'FLUJO | Lizzard Walk: 3x20m.' FROM d4_p10),
p10d4e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, 'e480722a-49f5-4bbf-b182-2f1c8735b7cf', 4, 3, 20, NULL, 30, 'FLUJO | Duck Walk: 3x20m.' FROM d4_p10),
p10d4e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, 'a26398a5-c263-4415-b5f1-f89724241f8d', 5, 3, 8, NULL, 30, 'FLUJO | Scorpion: 3x8/lado.' FROM d4_p10),
p10d4e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, '83d62eb5-d865-45b4-9ba1-9a7756ace7e5', 6, 3, 8, NULL, 30, 'FLUJO | Sit Up to Stand: 3x8.' FROM d4_p10),
p10d4e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d4_p10.id, '28b038f4-adbe-4c6e-bf57-2f5014bdfa59', 7, 1, 1, NULL, 0, 'CIERRE | Lower Body Stretching Series: 10 min.' FROM d4_p10)

SELECT 'Programs 6, 7, 8, 9, 10 inserted' AS result;
