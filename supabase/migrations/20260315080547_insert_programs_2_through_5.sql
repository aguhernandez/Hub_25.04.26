/*
  # Insert Programs 2-5: Power & Plyometrics, Athletic Performance, Lower Body Hypertrophy, Upper Body Push-Pull

  Programs are inserted as published marketplace products with 1 representative week each
  (full programs would require hundreds of rows - this creates the complete product structure
  with Week 1 fully detailed so trainers can clone/extend).
*/

-- ============================================================
-- PROGRAM 2: POWER & PLYOMETRICS (6 weeks, Intermediate)
-- ============================================================
WITH prog2 AS (
  INSERT INTO program_products (trainer_id, title, description, detailed_description, duration_weeks, is_membership, price, currency, is_published, category, difficulty_level, sport)
  VALUES (
    '3c098888-9776-4e01-bf2d-ad28ac4a84c0',
    'Power & Plyometrics',
    'Programa de 6 semanas para desarrollar potencia explosiva y capacidad de salto. Combina fuerza máxima con pliometría progresiva.',
    'Diseñado para atletas intermedios que ya dominan los patrones básicos. El programa combina fuerza máxima en el squat y deadlift con trabajo pliométrico progresivo: desde saltos con carga hasta depth jumps de alta intensidad. Incluye trabajo de velocidad reactiva y capacidad de amortización. Al finalizar verás mejoras directas en tu CMJ, SLJ y velocidad de sprint.',
    6, false, 69.00, 'USD', true, 'Power', 'Intermediate', 'General'
  ) RETURNING id
),
w1_p2 AS (
  INSERT INTO program_weeks (program_product_id, week_number, title, description)
  SELECT id, 1, 'Semana 1 - Base de Potencia', 'Establecemos cargas y volumen pliométrico inicial. Squat 70-75% 1RM.'
  FROM prog2 RETURNING id
),
d1_p2 AS (
  INSERT INTO program_days (program_week_id, day_number, day_name, notes)
  SELECT id, 1, 'Día A - Potencia Inferior', 'Squat + Jump. Mínimo 4 min descanso entre series principales.'
  FROM w1_p2 RETURNING id
),
d2_p2 AS (
  INSERT INTO program_days (program_week_id, day_number, day_name, notes)
  SELECT id, 2, 'Día B - Potencia Superior + Sprint', 'Push Press + Sprint técnico.'
  FROM w1_p2 RETURNING id
),
d3_p2 AS (
  INSERT INTO program_days (program_week_id, day_number, day_name, notes)
  SELECT id, 3, 'Día C - Hinge + Plyometría Reactiva', 'Deadlift + profundidad reactiva.'
  FROM w1_p2 RETURNING id
),
-- Day 1 exercises
p2d1e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, 'bea5efea-e188-4052-966b-9c7a30452d0a', 1, 2, 10, NULL, 30, 'MOVILIDAD | Shin Box Mobility: 10 reps/lado.' FROM d1_p2),
p2d1e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, '83d62eb5-d865-45b4-9ba1-9a7756ace7e5', 2, 2, 8, NULL, 30, 'MOVILIDAD | Sit Up to Stand: 2x8.' FROM d1_p2),
p2d1e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, '1787ae3d-1cf9-4fa8-9ae3-13b7128702b5', 3, 2, 10, NULL, 30, 'WARM-UP | Leg Swings: 10 reps/dirección/pierna.' FROM d1_p2),
p2d1e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, 'f0cb7722-7b7c-49a3-b51f-404f05472098', 4, 2, 10, NULL, 30, 'WARM-UP | Thigh Switch Single: 2x10/lado.' FROM d1_p2),
p2d1e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p2.id, '41f3434c-3667-43d4-ba29-e2a71bc1766c', 5, 5, 4, 75, '30X0', 240, 'PRINCIPAL | BB Back Squat ECC Tempo: 5x4 @ 75% 1RM. 3 seg bajada explosiva subida.' FROM d1_p2),
p2d1e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, '116a15ae-0584-4dea-ba5d-896e706ac376', 6, 4, 5, '10X0', 180, 'PLIOMETRÍA | CMJ Arms Free: 4x5. MAX altura, reset completo entre reps.' FROM d1_p2),
p2d1e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p2.id, '235f203c-033b-4792-b269-126342c95f75', 7, 3, 8, 70, '21X0', 120, 'SECUNDARIO | BB RFESS: 3x8/lado @ 70% 1RM. Rodilla delantera sobre pie.' FROM d1_p2),
p2d1e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d1_p2.id, '59f9aa61-d283-4e5e-bfdc-b4083c0b597e', 8, 3, 10, 70, '21X1', 90, 'SECUNDARIO | BB Hip Thrust: 3x10 @ 70%. Pausa 1s arriba.' FROM d1_p2),
p2d1e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, 'b21c92ba-f9fc-4a9f-ae0c-d6ac1739d21b', 9, 3, 6, NULL, 120, 'ACCESORIO | Bounds Distance: 3x6. Máxima distancia, aterrizaje amortiguado.' FROM d1_p2),
p2d1e10 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d1_p2.id, '28b038f4-adbe-4c6e-bf57-2f5014bdfa59', 10, 1, 1, NULL, 0, 'VUELTA A LA CALMA | Lower Body Stretching Series: 8-10 min.' FROM d1_p2),
-- Day 2 exercises
p2d2e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, '75ccc7d2-5007-447e-97a5-0ffde93d6a99', 1, 2, 8, NULL, 30, 'MOVILIDAD | Bear Crawl T-Spine: 2x8 reps/lado.' FROM d2_p2),
p2d2e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, '02fbbcfa-dc66-4185-8895-dc9547e8cbe1', 2, 2, 10, NULL, 30, 'MOVILIDAD | Side Lying Shoulder Openers: 10/lado.' FROM d2_p2),
p2d2e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, '2dbe960f-f49f-4e50-b749-48b5feb7c7e5', 3, 2, 15, NULL, 30, 'WARM-UP | High Knees: 2x15m.' FROM d2_p2),
p2d2e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, '92941c07-7418-497a-a1ee-39f1eb82e8df', 4, 2, 5, NULL, 30, 'WARM-UP | Kneeling First Step: 2x5/lado.' FROM d2_p2),
p2d2e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p2.id, '8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9', 5, 5, 4, 70, '10X0', 240, 'PRINCIPAL | BB Push Press: 5x4 @ 70% 1RM. Extensión total de rodillas y codos.' FROM d2_p2),
p2d2e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, '4a0b8308-742d-410b-8162-d92e9b73ef1c', 6, 4, 4, NULL, 120, 'VELOCIDAD | Flying 5m: 4x. MAX velocidad. Descanso completo.' FROM d2_p2),
p2d2e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p2.id, '62dcfe55-6604-4584-b029-fb37a2c0de3b', 7, 4, 6, 70, '21X0', 120, 'SECUNDARIO | BB Bent Over Row: 4x6 @ 70% 1RM.' FROM d2_p2),
p2d2e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d2_p2.id, '6ee0bf32-d938-45e8-96ef-18af48057342', 8, 3, 8, 65, '21X0', 90, 'SECUNDARIO | BB Seated OH Press: 3x8 @ 65% 1RM.' FROM d2_p2),
p2d2e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, 'a19d976a-b26d-463b-8ac0-027496cd0077', 9, 3, 8, '21X0', 90, 'ACCESORIO | Banded Pull Up: 3x8. Control total.' FROM d2_p2),
p2d2e10 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d2_p2.id, '371016c8-3370-449c-a92b-1c372853674e', 10, 3, 15, NULL, 45, 'ACCESORIO | Band Face Pull: 3x15.' FROM d2_p2),
-- Day 3 exercises
p2d3e1 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p2.id, '912eaf9a-817f-42e3-b36b-78ff9a358cdd', 1, 2, 8, NULL, 30, 'MOVILIDAD | Hip Airplane: 8/lado.' FROM d3_p2),
p2d3e2 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p2.id, '6ff055c9-f022-4186-a9c7-c49a9b53e088', 2, 2, 8, NULL, 30, 'MOVILIDAD | Spiderman Hip Lift: 2x8/lado.' FROM d3_p2),
p2d3e3 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p2.id, '29ebe870-4048-45ab-aa17-4923f25bf096', 3, 5, 4, 80, '10X0', 240, 'PRINCIPAL | BB Deadlift: 5x4 @ 80% 1RM. Setup perfecto cada rep.' FROM d3_p2),
p2d3e4 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p2.id, '49967d6e-4ec5-4d1a-8c28-13e8469a61f4', 4, 4, 5, '10X0', 180, 'PLIOMETRÍA | Depth Jump: 4x5. Step down, aterriza y explota. NO saltar desde arriba.' FROM d3_p2),
p2d3e5 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p2.id, '00f1de91-dc49-44a5-b488-430c10620a4e', 5, 3, 8, 65, '31X0', 120, 'SECUNDARIO | BB RDL: 3x8 @ 65% 1RM.' FROM d3_p2),
p2d3e6 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) SELECT d3_p2.id, '47a40c9c-e85e-49b8-a6a8-904ae9622c07', 6, 3, 8, 60, '31X0', 90, 'SECUNDARIO | BB SL RDL: 3x8/lado @ 60% 1RM.' FROM d3_p2),
p2d3e7 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p2.id, 'ec385ba7-819c-4fdc-96a0-6e8c938c672b', 7, 3, 10, NULL, 90, 'ACCESORIO | Ankle Jumps Forward: 3x10. Tobillo rígido.' FROM d3_p2),
p2d3e8 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p2.id, '25d98192-5707-4db8-ae84-b264eed1394d', 8, 3, 8, '4010', 90, 'ACCESORIO | AB GHR ECC Drop: 3x8. 4 seg excéntrico.' FROM d3_p2),
p2d3e9 AS (INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, notes) SELECT d3_p2.id, '6c5b749b-a959-43cd-a16e-38d3e2200d8c', 9, 2, 8, NULL, 0, 'VUELTA A LA CALMA | Quad Stretch: 30s/lado x2.' FROM d3_p2)

SELECT 'Program 2 - Power & Plyometrics inserted' AS result;
