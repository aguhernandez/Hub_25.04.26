/*
  # Explosive Power Elite + Mobility & Movement Quality - Semanas 2-8
  
  Programa 9: Explosive Power Elite (c481a180) - Descarga semana 5 (programa de alta intensidad)
  Programa 10: Mobility & Movement Quality (74a62ad9) - Descarga semana 3 (frecuencia mayor)
  
  Explosive Power Elite Periodización (85-95% 1RM):
  - S1: 85% base (ya insertada)
  - S2: 87.5%
  - S3: 87.5% + volumen
  - S4: 90%
  - S5: DESCARGA 70% (semana 5 por ser avanzado)
  - S6: 90%
  - S7: 92.5% PICO
  - S8: DESCARGA FINAL 75%
  
  Mobility & Movement Quality (4 días/semana):
  - S1-S2: Movilidad base
  - S3: DESCARGA (reducción de volumen)
  - S4-S6: Complejidad creciente
  - S7: PICO movilidad
  - S8: DESCARGA FINAL
*/

DO $$
DECLARE
  p9 uuid := 'c481a180-2c5f-4dd1-a649-9ee917cbdfcf';
  p10 uuid := '74a62ad9-69bb-4c5b-a563-a095e276018d';
  
  -- P9 weeks
  p9w2 uuid; p9w3 uuid; p9w4 uuid; p9w5 uuid; p9w6 uuid; p9w7 uuid; p9w8 uuid;
  p9w2d1 uuid; p9w2d2 uuid; p9w2d3 uuid;
  p9w3d1 uuid; p9w3d2 uuid; p9w3d3 uuid;
  p9w4d1 uuid; p9w4d2 uuid; p9w4d3 uuid;
  p9w5d1 uuid; p9w5d2 uuid; p9w5d3 uuid;
  p9w6d1 uuid; p9w6d2 uuid; p9w6d3 uuid;
  p9w7d1 uuid; p9w7d2 uuid; p9w7d3 uuid;
  p9w8d1 uuid; p9w8d2 uuid; p9w8d3 uuid;
  
  -- P10 weeks
  p10w2 uuid; p10w3 uuid; p10w4 uuid; p10w5 uuid; p10w6 uuid; p10w7 uuid; p10w8 uuid;
  p10w2d1 uuid; p10w2d2 uuid; p10w2d3 uuid; p10w2d4 uuid;
  p10w3d1 uuid; p10w3d2 uuid; p10w3d3 uuid; p10w3d4 uuid;
  p10w4d1 uuid; p10w4d2 uuid; p10w4d3 uuid; p10w4d4 uuid;
  p10w5d1 uuid; p10w5d2 uuid; p10w5d3 uuid; p10w5d4 uuid;
  p10w6d1 uuid; p10w6d2 uuid; p10w6d3 uuid; p10w6d4 uuid;
  p10w7d1 uuid; p10w7d2 uuid; p10w7d3 uuid; p10w7d4 uuid;
  p10w8d1 uuid; p10w8d2 uuid; p10w8d3 uuid; p10w8d4 uuid;
BEGIN

-- ==================== EXPLOSIVE POWER ELITE - WEEKS 2-8 ====================

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 2, 'Semana 2 - Potencia Máxima', '87.5% 1RM. Reducir rep a 2. Alta velocidad concéntrica.') RETURNING id INTO p9w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w2,1,'Día A - Máxima Fuerza Inferior') RETURNING id INTO p9w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w2,2,'Día B - Potencia Superior') RETURNING id INTO p9w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w2,3,'Día C - Deadlift + Velocidad') RETURNING id INTO p9w2d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p9w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p9w2d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,6,2,87.5,'10X0',240,'PRINCIPAL | BB Back Squat: 6x2 @ 87.5%. Velocidad máxima.'),
(p9w2d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3. Máxima altura.'),
(p9w2d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',5,4,3,null,'10X0',150,'PLIOMETRÍA | Depth Jump: 4x3. Drop 55cm.'),
(p9w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',6,3,4,82.5,'20X0',150,'SECUNDARIO | BB Reverse Lunge: 3x4 @ 82.5%'),
(p9w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,3,30,null,null,60,'CORE | Plank'),
(p9w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w2d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p9w2d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN'),
(p9w2d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',3,6,2,77.5,'10X0',210,'PRINCIPAL | BB Push Press: 6x2 @ 77.5%'),
(p9w2d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',4,4,3,82.5,'21X0',180,'SECUNDARIO | BB Bench Press: 4x3 @ 82.5%'),
(p9w2d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',5,4,4,82.5,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x4 @ 82.5%'),
(p9w2d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',6,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(p9w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w2d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p9w2d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,10,null,'20X0',45,'ACTIVACIÓN'),
(p9w2d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,6,2,87.5,'10X0',240,'PRINCIPAL | BB Conventional Deadlift: 6x2 @ 87.5%'),
(p9w2d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',4,4,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 4x8'),
(p9w2d3,'00f1de91-dc49-44a5-b488-430c10620a4e',5,3,4,82.5,'31X0',150,'SECUNDARIO | BB RDL: 3x4 @ 82.5%'),
(p9w2d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',6,3,5,85,'21X1',150,'SECUNDARIO | BB Hip Thrust: 3x5 @ 85%'),
(p9w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 3, 'Semana 3 - Potencia + Volumen', '87.5% + volumen pliométrico. CMJ + Depth Jump máximo.') RETURNING id INTO p9w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w3,1,'Día A - Máxima Fuerza Inferior') RETURNING id INTO p9w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w3,2,'Día B - Potencia Superior') RETURNING id INTO p9w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w3,3,'Día C - Deadlift + Velocidad') RETURNING id INTO p9w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w3d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,6,2,87.5,'10X0',240,'PRINCIPAL | Squat: 6x2 @ 87.5%'),
(p9w3d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,6,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 6x3. +1 serie.'),
(p9w3d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,5,3,null,'10X0',150,'PLIOMETRÍA | Depth Jump: 5x3. Drop 60cm.'),
(p9w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',4,3,4,82.5,'20X0',150,'SECUNDARIO | Lunge: 3x4 @ 82.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w3d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,6,2,77.5,'10X0',210,'Push Press: 6x2 @ 77.5%'),
(p9w3d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',2,4,3,82.5,'21X0',180,'Bench Press: 4x3 @ 82.5%'),
(p9w3d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,4,4,82.5,'31X0',150,'Bent Over Row: 4x4 @ 82.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w3d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,6,2,87.5,'10X0',240,'Deadlift: 6x2 @ 87.5%'),
(p9w3d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,5,8,null,'10X0',90,'Ankle Jumps: 5x8'),
(p9w3d3,'00f1de91-dc49-44a5-b488-430c10620a4e',3,3,4,82.5,'31X0',150,'BB RDL: 3x4 @ 82.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 4, 'Semana 4 - 90% Intensidad', '90% 1RM. Pico del primer bloque. 5x2.') RETURNING id INTO p9w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w4,1,'Día A - 90% Squat') RETURNING id INTO p9w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w4,2,'Día B - 90% Superior') RETURNING id INTO p9w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w4,3,'Día C - 90% Deadlift') RETURNING id INTO p9w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w4d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,2,90,'10X0',270,'PICO BLOQUE 1 | Squat: 5x2 @ 90%'),
(p9w4d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',120,'CMJ: 4x3'),
(p9w4d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,4,3,null,'10X0',150,'Depth Jump: 4x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w4d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,5,2,80,'10X0',240,'Push Press: 5x2 @ 80%'),
(p9w4d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',2,4,2,87.5,'21X0',210,'Bench Press: 4x2 @ 87.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w4d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,2,90,'10X0',270,'PICO BLOQUE 1 | Deadlift: 5x2 @ 90%'),
(p9w4d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,3,8,null,'10X0',90,'Ankle Jumps');

-- WEEK 5 DESCARGA (en la semana 5 para este programa avanzado de alta intensidad)
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 5, 'Semana 5 - DESCARGA', 'Descarga necesaria después de 4 semanas de alta intensidad. 70%. Recuperación SNC.') RETURNING id INTO p9w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w5,1,'Día A - DESCARGA') RETURNING id INTO p9w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w5,2,'Día B - DESCARGA') RETURNING id INTO p9w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w5,3,'Día C - DESCARGA') RETURNING id INTO p9w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w5d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,3,70,'20X0',180,'DESCARGA | Squat: 4x3 @ 70%. Recuperar SNC.'),
(p9w5d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',120,'CMJ: 3x3. Calidad.');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w5d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,3,65,'10X0',180,'DESCARGA | Push Press: 4x3 @ 65%'),
(p9w5d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,5,70,'31X0',150,'Row: 4x5 @ 70%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w5d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,3,70,'20X0',180,'DESCARGA | Deadlift: 4x3 @ 70%'),
(p9w5d3,'00f1de91-dc49-44a5-b488-430c10620a4e',2,3,5,70,'31X0',120,'BB RDL: 3x5 @ 70%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 6, 'Semana 6 - Segundo Bloque 90%', 'Reanudación con 90%. Preparar pico final.') RETURNING id INTO p9w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w6,1,'Día A - 90% Inferior') RETURNING id INTO p9w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w6,2,'Día B - 90% Superior') RETURNING id INTO p9w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w6,3,'Día C - 90% Deadlift') RETURNING id INTO p9w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w6d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,2,90,'10X0',270,'SEGUNDO BLOQUE | Squat: 5x2 @ 90%'),
(p9w6d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,5,3,null,'10X0',120,'CMJ: 5x3'),
(p9w6d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,5,3,null,'10X0',150,'Depth Jump: 5x3. Drop 60cm.');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w6d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,5,2,80,'10X0',240,'Push Press: 5x2 @ 80%'),
(p9w6d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',2,4,2,87.5,'21X0',210,'Bench Press: 4x2 @ 87.5%'),
(p9w6d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,4,4,87.5,'31X0',180,'Bent Over Row: 4x4 @ 87.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w6d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,2,90,'10X0',270,'Deadlift: 5x2 @ 90%'),
(p9w6d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,5,8,null,'10X0',90,'Ankle Jumps: 5x8'),
(p9w6d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',3,3,4,87.5,'21X1',150,'Hip Thrust: 3x4 @ 87.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 7, 'Semana 7 - PICO ABSOLUTO', '92.5% 1RM. Máxima del programa. 4x1-2.') RETURNING id INTO p9w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w7,1,'Día A - PICO Squat') RETURNING id INTO p9w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w7,2,'Día B - PICO Superior') RETURNING id INTO p9w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w7,3,'Día C - PICO Deadlift') RETURNING id INTO p9w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w7d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,2,92.5,'10X0',300,'PICO ABSOLUTO | Squat: 4x2 @ 92.5%'),
(p9w7d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',120,'CMJ: 4x3'),
(p9w7d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,4,3,null,'10X0',150,'Depth Jump: 4x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w7d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,2,82.5,'10X0',270,'PICO | Push Press: 4x2 @ 82.5%'),
(p9w7d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',2,4,2,90,'21X0',240,'PICO | Bench Press: 4x2 @ 90%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w7d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,2,92.5,'10X0',300,'PICO ABSOLUTO | Deadlift: 4x2 @ 92.5%'),
(p9w7d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,3,8,null,'10X0',90,'Ankle Jumps');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p9, 8, 'Semana 8 - DESCARGA FINAL', 'Taper. 75% 1RM. Recuperación neurológica completa.') RETURNING id INTO p9w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w8,1,'Día A - DESCARGA FINAL') RETURNING id INTO p9w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w8,2,'Día B - DESCARGA FINAL') RETURNING id INTO p9w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p9w8,3,'Día C - DESCARGA FINAL') RETURNING id INTO p9w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w8d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,3,75,'20X0',180,'DESCARGA FINAL | Squat: 4x3 @ 75%'),
(p9w8d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',120,'CMJ: 3x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w8d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,3,67.5,'10X0',180,'Push Press: 4x3 @ 67.5%'),
(p9w8d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,4,75,'31X0',150,'Row: 3x4 @ 75%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p9w8d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,3,75,'20X0',180,'Deadlift: 4x3 @ 75%'),
(p9w8d3,'00f1de91-dc49-44a5-b488-430c10620a4e',2,2,5,75,'31X0',120,'BB RDL: 2x5 @ 75%');

UPDATE program_products SET duration_weeks = 8 WHERE id = p9;

-- ==================== MOBILITY & MOVEMENT QUALITY - WEEKS 2-8 ====================
-- Programa de movilidad: progresión de complejidad, no carga

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 2, 'Semana 2 - Movilidad Profunda', 'Aumentar ROM. Compound mobility + Animal Flow básico.') RETURNING id INTO p10w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w2,1,'Día A - Cadera Completa') RETURNING id INTO p10w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w2,2,'Día B - Columna Torácica y Hombro') RETURNING id INTO p10w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w2,3,'Día C - Tobillo + Patrones Básicos') RETURNING id INTO p10w2d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w2,4,'Día D - Flujo Completo') RETURNING id INTO p10w2d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,12,null,null,30,'MOVILIDAD | 90-90: 3x12. +2 reps respecto semana 1.'),
(p10w2d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,3,10,null,null,30,'MOVILIDAD | Spiderman Hip Openers: 3x10'),
(p10w2d1,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',3,3,10,null,null,30,'MOVILIDAD | Hip Airplane: 3x10/lado'),
(p10w2d1,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',4,2,30,null,null,30,'MOVILIDAD | Hip Flexor Stretch: 2x30s/lado'),
(p10w2d1,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',5,3,15,null,'21X1',45,'ACTIVACIÓN | BB Glute Bridge: 3x15. Pausa 1s arriba.'),
(p10w2d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',6,3,15,null,null,45,'ACTIVACIÓN | Hip Abduction: 3x15/lado'),
(p10w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',7,3,12,null,null,45,'PATRÓN | Birddog: 3x12/lado. Control lumbar.'),
(p10w2d1,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',8,3,15,null,null,45,'LATERAL | Banded X-Walk: 3x15 pasos'),
(p10w2d1,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',9,1,1,null,null,0,'VUELTA A LA CALMA | Hamstring Stretch');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w2d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,3,10,null,null,30,'MOVILIDAD | Side Lying Windmill: 3x10/lado'),
(p10w2d2,'02fbbcfa-dc66-4185-8895-dc9547e8cbe1',2,3,10,null,null,30,'MOVILIDAD | Shoulder Openers: 3x10'),
(p10w2d2,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',3,3,10,null,null,30,'MOVILIDAD | Deep Squat T-Spine Rotation: 3x10'),
(p10w2d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',4,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart: 3x15'),
(p10w2d2,'63e02cc4-3b48-4ed2-8b01-a2041c18a874',5,3,12,null,null,30,'ACTIVACIÓN | Shoulder ER Lift Offs: 3x12'),
(p10w2d2,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,40,null,null,60,'CORE | Plank: 3x40s. +10s vs semana 1.'),
(p10w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w2d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(p10w2d3,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,10,null,null,30,'MOVILIDAD | Spiderman'),
(p10w2d3,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',3,3,10,null,null,30,'MOVILIDAD | Deep Squat T-Spine'),
(p10w2d3,'e705cbd3-046e-41dc-9c08-b95f164d65c9',4,3,12,null,null,45,'PATRÓN | Birddog'),
(p10w2d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,8,null,'30X0',60,'PATRÓN BÁSICO | BW Reverse Lunge: 3x8/lado. Control.'),
(p10w2d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',6,3,15,null,'20X0',45,'BB Glute Bridge: 3x15'),
(p10w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w2d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(p10w2d4,'c2374292-62aa-4898-8f63-a74da2c19a43',2,2,10,null,null,30,'MOVILIDAD | Windmill'),
(p10w2d4,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',3,3,10,null,null,30,'Hip Airplane: 3x10'),
(p10w2d4,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',4,3,10,null,null,30,'Deep Squat T-Spine'),
(p10w2d4,'e705cbd3-046e-41dc-9c08-b95f164d65c9',5,3,12,null,null,45,'Birddog: 3x12'),
(p10w2d4,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',6,3,15,null,'21X1',45,'Glute Bridge: 3x15. Integración cadera.'),
(p10w2d4,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,3,45,null,null,60,'Plank: 3x45s'),
(p10w2d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA | Sesión completa 45-50min');

-- Week 3 DESCARGA Movilidad
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 3, 'Semana 3 - DESCARGA Activa', 'Semana suave. Reducir sets. Foco en respiración y relajación profunda.') RETURNING id INTO p10w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w3,1,'Día A - Movilidad Cadera Suave') RETURNING id INTO p10w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w3,2,'Día B - Movilidad Tórax Suave') RETURNING id INTO p10w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w3,3,'Día C - Patrones Básicos') RETURNING id INTO p10w3d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w3,4,'Día D - Respiración + Flujo') RETURNING id INTO p10w3d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w3d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'DESCARGA | 90-90: 2x10. Respiración diafragmática.'),
(p10w3d1,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',2,2,30,null,null,30,'Hip Flexor Stretch: 2x30s suave'),
(p10w3d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',3,2,12,null,null,45,'Hip Abduction: 2x12'),
(p10w3d1,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',4,1,1,null,null,0,'STRETCHING completo 10min');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w3d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'Side Lying Windmill: 2x8'),
(p10w3d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,2,12,null,null,30,'Band Pullapart: 2x12'),
(p10w3d2,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',3,2,30,null,null,60,'Plank: 2x30s. Relajado.');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w3d3,'e705cbd3-046e-41dc-9c08-b95f164d65c9',1,2,10,null,null,45,'Birddog: 2x10. Lento y controlado.'),
(p10w3d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,2,12,null,'20X0',45,'Glute Bridge: 2x12');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w3d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'90-90 + respiración'),
(p10w3d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',2,1,1,null,null,0,'FLUJO COMPLETO | 15 min. Exploración libre.');

-- Weeks 4-8 Mobility with increasing complexity
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 4, 'Semana 4 - Complejidad Intermedia', 'Introducir compound mobility. Integración patrones.') RETURNING id INTO p10w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w4,1,'Día A - Cadera + Columna Integrada') RETURNING id INTO p10w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w4,2,'Día B - Tórax + Escápula') RETURNING id INTO p10w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w4,3,'Día C - Cadena Posterior + Tobillo') RETURNING id INTO p10w4d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w4,4,'Día D - Flujo Completo') RETURNING id INTO p10w4d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w4d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,12,null,null,30,'90-90: 3x12. Mayor ROM.'),
(p10w4d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,3,10,null,null,30,'Spiderman Complex: 3x10'),
(p10w4d1,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',3,3,12,null,null,30,'Deep Squat T-Spine: 3x12'),
(p10w4d1,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',4,3,10,null,null,45,'Hip Airplane: 3x10'),
(p10w4d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',5,3,12,null,null,45,'Birddog: 3x12'),
(p10w4d1,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',6,3,15,null,'21X1',45,'Glute Bridge: 3x15'),
(p10w4d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,3,45,null,null,60,'Plank: 3x45s'),
(p10w4d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w4d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,3,12,null,null,30,'Side Lying Windmill: 3x12'),
(p10w4d2,'02fbbcfa-dc66-4185-8895-dc9547e8cbe1',2,3,12,null,null,30,'Shoulder Openers: 3x12'),
(p10w4d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',3,3,15,null,null,30,'Band Pullapart: 3x15'),
(p10w4d2,'63e02cc4-3b48-4ed2-8b01-a2041c18a874',4,3,15,null,null,30,'Shoulder ER Lift Offs: 3x15'),
(p10w4d2,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',5,3,50,null,null,60,'Plank: 3x50s'),
(p10w4d2,'192d3181-13ef-45da-84d6-a41c579e6994',6,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w4d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,3,30,null,null,30,'Hip Flexor Stretch: 3x30s'),
(p10w4d3,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,3,12,null,null,30,'Hip Airplane: 3x12'),
(p10w4d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',3,3,20,null,null,45,'Banded X-Walk: 3x20 pasos'),
(p10w4d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',4,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w4d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,12,null,null,30,'90-90 flow'),
(p10w4d4,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',2,2,10,null,null,30,'Deep Squat T-Spine'),
(p10w4d4,'6ff055c9-f022-4186-a9c7-c49a9b53e088',3,2,10,null,null,30,'Spiderman'),
(p10w4d4,'e705cbd3-046e-41dc-9c08-b95f164d65c9',4,3,12,null,null,45,'Birddog'),
(p10w4d4,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',5,3,45,null,null,60,'Plank: 3x45s'),
(p10w4d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',6,1,1,null,null,0,'FLUJO COMPLETO 20 min');

-- Weeks 5-8 continuing progression
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 5, 'Semana 5 - Patrones Compuestos', 'Compound movements + loaded mobility. Introducir peso ligero.') RETURNING id INTO p10w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w5,1,'Día A - Movilidad con Carga Ligera') RETURNING id INTO p10w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w5,2,'Día B - Tórax Avanzado') RETURNING id INTO p10w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w5,3,'Día C - Cadena Posterior') RETURNING id INTO p10w5d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w5,4,'Día D - Flujo Avanzado') RETURNING id INTO p10w5d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w5d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,12,null,null,30,'90-90: 3x12'),
(p10w5d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,3,12,null,null,30,'Spiderman Complex: 3x12'),
(p10w5d1,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',3,3,12,null,null,30,'Deep Squat T-Spine: 3x12'),
(p10w5d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',4,3,12,null,null,45,'Birddog: 3x12'),
(p10w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,10,null,'30X0',60,'LOADED | BW Reverse Lunge: 3x10/lado. Control total.'),
(p10w5d1,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',6,3,15,null,'21X1',45,'Glute Bridge: 3x15'),
(p10w5d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,3,50,null,null,60,'Plank: 3x50s'),
(p10w5d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w5d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,3,12,null,null,30,'Side Lying Windmill: 3x12'),
(p10w5d2,'02fbbcfa-dc66-4185-8895-dc9547e8cbe1',2,3,12,null,null,30,'Shoulder Openers'),
(p10w5d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',3,3,20,null,null,30,'Band Pullapart: 3x20'),
(p10w5d2,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,50,null,null,60,'Plank'),
(p10w5d2,'192d3181-13ef-45da-84d6-a41c579e6994',5,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w5d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,3,30,null,null,30,'Hip Flexor: 3x30s'),
(p10w5d3,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,3,12,null,null,45,'Hip Airplane: 3x12'),
(p10w5d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',3,3,20,null,null,45,'Banded X-Walk'),
(p10w5d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',4,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w5d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,12,null,null,30,'90-90 + respiración'),
(p10w5d4,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',2,3,12,null,null,30,'Deep Squat T-Spine'),
(p10w5d4,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,3,12,null,null,45,'Birddog'),
(p10w5d4,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,50,null,null,60,'Plank'),
(p10w5d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',5,1,1,null,null,0,'FLUJO LIBRE 25 min. Máxima exploración.');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 6, 'Semana 6 - Integración Total', 'Patrón complejo integrado. Animal Flow avanzado.') RETURNING id INTO p10w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w6,1,'Día A - Cadera Avanzada') RETURNING id INTO p10w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w6,2,'Día B - Tórax + Hombro Complejo') RETURNING id INTO p10w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w6,3,'Día C - Full Body Mobility') RETURNING id INTO p10w6d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w6,4,'Día D - Flow Máximo') RETURNING id INTO p10w6d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w6d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,15,null,null,30,'90-90: 3x15. +ROM activo.'),
(p10w6d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,3,12,null,null,30,'Spiderman Complex'),
(p10w6d1,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',3,3,12,null,null,45,'Hip Airplane: 3x12/lado'),
(p10w6d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',4,3,15,null,null,45,'Birddog: 3x15'),
(p10w6d1,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',5,3,15,null,'21X1',45,'Glute Bridge'),
(p10w6d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,55,null,null,60,'Plank: 3x55s');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w6d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,3,15,null,null,30,'Side Lying Windmill'),
(p10w6d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,20,null,null,30,'Band Pullapart: 3x20'),
(p10w6d2,'63e02cc4-3b48-4ed2-8b01-a2041c18a874',3,3,15,null,null,30,'Shoulder ER Lift Offs');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w6d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,12,null,null,30,'90-90'),
(p10w6d3,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',2,3,12,null,null,30,'Deep Squat T-Spine'),
(p10w6d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',3,3,30,null,null,30,'Hip Flexor'),
(p10w6d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',4,3,20,null,null,45,'Banded X-Walk');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w6d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,12,null,null,30,'Integración movilidad completa'),
(p10w6d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',2,1,1,null,null,0,'FLUJO LIBRE 30 min. Evaluación ROM final bloque 1.');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 7, 'Semana 7 - PICO MOVILIDAD', 'Máxima complejidad. Secuencias completas. Evaluar ROM ganado.') RETURNING id INTO p10w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w7,1,'Día A - Pico Cadera y Columna') RETURNING id INTO p10w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w7,2,'Día B - Pico Tórax y Hombro') RETURNING id INTO p10w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w7,3,'Día C - Full Body Assessment') RETURNING id INTO p10w7d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w7,4,'Día D - Flujo Libre Evaluación') RETURNING id INTO p10w7d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w7d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,4,15,null,null,30,'PICO | 90-90: 4x15. ROM máximo ganado.'),
(p10w7d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,3,12,null,null,30,'Spiderman Complex'),
(p10w7d1,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',3,4,12,null,null,45,'Hip Airplane: 4x12'),
(p10w7d1,'78491ed4-2f0b-49b6-ace6-9a9b9f99eb7f',4,3,15,null,null,30,'Deep Squat T-Spine'),
(p10w7d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',5,4,15,null,null,45,'Birddog: 4x15'),
(p10w7d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,4,60,null,null,60,'Plank: 4x60s');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w7d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,4,15,null,null,30,'Side Lying Windmill: 4x15'),
(p10w7d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,20,null,null,30,'Band Pullapart'),
(p10w7d2,'02fbbcfa-dc66-4185-8895-dc9547e8cbe1',3,3,15,null,null,30,'Shoulder Openers'),
(p10w7d2,'63e02cc4-3b48-4ed2-8b01-a2041c18a874',4,3,15,null,null,30,'Shoulder ER Lift Offs');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w7d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,12,null,null,30,'Full assessment ROM: 90-90'),
(p10w7d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',2,3,30,null,null,30,'Hip Flexor'),
(p10w7d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',3,3,20,null,null,45,'Banded X-Walk');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w7d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,15,null,null,30,'EVALUACIÓN FINAL | Medir ROM ganado en todas las articulaciones.'),
(p10w7d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',2,1,1,null,null,0,'FLUJO LIBRE 35 min.');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p10, 8, 'Semana 8 - DESCARGA FINAL', 'Sesión suave de consolidación. Mantener ROM ganado. Plan de mantenimiento.') RETURNING id INTO p10w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w8,1,'Día A - Descarga Activa Cadera') RETURNING id INTO p10w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w8,2,'Día B - Descarga Activa Tórax') RETURNING id INTO p10w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w8,3,'Día C - Full Body Suave') RETURNING id INTO p10w8d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p10w8,4,'Día D - Evaluación y Plan') RETURNING id INTO p10w8d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w8d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'DESCARGA | 90-90: 2x10. Mantener ROM.'),
(p10w8d1,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',2,2,30,null,null,30,'Hip Flexor: 2x30s'),
(p10w8d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',3,2,12,null,null,45,'Hip Abduction');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w8d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,10,null,null,30,'Side Lying Windmill: 2x10'),
(p10w8d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,2,15,null,null,30,'Band Pullapart');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w8d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'90-90'),
(p10w8d3,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,45,'Birddog'),
(p10w8d3,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',3,2,45,null,null,60,'Plank: 2x45s');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p10w8d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'EVALUACION FINAL | Medir ROM vs Semana 1. Comparar.'),
(p10w8d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',2,1,1,null,null,0,'FLUJO LIBRE 20 min. Celebrar progreso y planificar continuación.');

UPDATE program_products SET duration_weeks = 8 WHERE id IN (p9, p10);

END $$;
