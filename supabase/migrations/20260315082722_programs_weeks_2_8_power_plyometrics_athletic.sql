/*
  # Power & Plyometrics + Athletic Performance - Semanas 2-8
  
  Programa 2: Power & Plyometrics (c8cb6a92) - Descarga semana 4
  Programa 3: Athletic Performance (83e1134e) - Descarga semana 4
  
  Periodización Power & Plyometrics:
  - S1: 70% + CMJ/Box Jumps (base)
  - S2: 72.5% + Depth Jump introducción
  - S3: 75% + volumen plyométrico
  - S4: DESCARGA 60%
  - S5: 77.5% + Depth Jump progresivo
  - S6: 80% + plyometría alta intensidad
  - S7: 82.5% PICO
  - S8: DESCARGA FINAL 65%
*/

DO $$
DECLARE
  -- Power & Plyometrics
  p2 uuid := 'c8cb6a92-0eec-4710-9ced-4e351a731cb6';
  -- Athletic Performance
  p3 uuid := '83e1134e-acb0-49b0-8078-a746b97c77d2';
  
  -- P2 weeks
  p2w2 uuid; p2w3 uuid; p2w4 uuid; p2w5 uuid; p2w6 uuid; p2w7 uuid; p2w8 uuid;
  p2w2d1 uuid; p2w2d2 uuid; p2w2d3 uuid;
  p2w3d1 uuid; p2w3d2 uuid; p2w3d3 uuid;
  p2w4d1 uuid; p2w4d2 uuid; p2w4d3 uuid;
  p2w5d1 uuid; p2w5d2 uuid; p2w5d3 uuid;
  p2w6d1 uuid; p2w6d2 uuid; p2w6d3 uuid;
  p2w7d1 uuid; p2w7d2 uuid; p2w7d3 uuid;
  p2w8d1 uuid; p2w8d2 uuid; p2w8d3 uuid;
  
  -- P3 weeks
  p3w2 uuid; p3w3 uuid; p3w4 uuid; p3w5 uuid; p3w6 uuid; p3w7 uuid; p3w8 uuid;
  p3w2d1 uuid; p3w2d2 uuid; p3w2d3 uuid; p3w2d4 uuid;
  p3w3d1 uuid; p3w3d2 uuid; p3w3d3 uuid; p3w3d4 uuid;
  p3w4d1 uuid; p3w4d2 uuid; p3w4d3 uuid; p3w4d4 uuid;
  p3w5d1 uuid; p3w5d2 uuid; p3w5d3 uuid; p3w5d4 uuid;
  p3w6d1 uuid; p3w6d2 uuid; p3w6d3 uuid; p3w6d4 uuid;
  p3w7d1 uuid; p3w7d2 uuid; p3w7d3 uuid; p3w7d4 uuid;
  p3w8d1 uuid; p3w8d2 uuid; p3w8d3 uuid; p3w8d4 uuid;
BEGIN

-- ==================== POWER & PLYOMETRICS - WEEKS 2-8 ====================

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 2, 'Semana 2 - Progresión Potencia', 'Squat 72.5%. Depth Jump introducción. Velocidad de ejecución prioritaria.') RETURNING id INTO p2w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w2, 1, 'Día A - Potencia Inferior') RETURNING id INTO p2w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w2, 2, 'Día B - Potencia Superior + Sprint') RETURNING id INTO p2w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w2, 3, 'Día C - Hinge + Pliometría Reactiva') RETURNING id INTO p2w2d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(p2w2d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(p2w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(p2w2d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',4,5,3,72.5,'20X0',210,'PRINCIPAL | BB Back Squat: 5x3 @ 72.5%. Concentrico explosivo.'),
(p2w2d1,'116a15ae-0584-4dea-ba5d-896e706ac376',5,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3. Máxima altura.'),
(p2w2d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',6,3,3,null,'10X0',120,'PLIOMETRÍA | Depth Jump: 3x3. Introducción. Drop 40cm.'),
(p2w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',7,3,6,70,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 70%'),
(p2w2d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',8,3,10,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(p2w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',9,2,30,null,null,60,'ACCESORIO | Plank'),
(p2w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',10,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w2d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(p2w2d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(p2w2d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',3,5,3,65,'10X0',180,'PRINCIPAL | BB Push Press: 5x3 @ 65%. Explosión total.'),
(p2w2d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,5,72.5,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x5 @ 72.5%'),
(p2w2d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,8,70,'21X0',90,'SECUNDARIO | BB Incline Press: 3x8 @ 70%'),
(p2w2d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,10,null,'21X0',90,'ACCESORIO | Cable Low Row'),
(p2w2d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',7,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(p2w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w2d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(p2w2d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,10,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(p2w2d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,5,3,72.5,'20X0',210,'PRINCIPAL | BB Conventional Deadlift: 5x3 @ 72.5%. Explosivo desde suelo.'),
(p2w2d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',4,4,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 4x8. Reactivo.'),
(p2w2d3,'00f1de91-dc49-44a5-b488-430c10620a4e',5,3,6,70,'31X0',120,'SECUNDARIO | BB RDL: 3x6 @ 70%'),
(p2w2d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',6,3,8,72.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 72.5%'),
(p2w2d3,'25d98192-5707-4db8-ae84-b264eed1394d',7,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p2w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,2,8,null,null,0,'VUELTA A LA CALMA');

-- P2 Week 3
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 3, 'Semana 3 - Volumen Pliométrico', 'Squat 75%. Aumentar volumen Depth Jump y CMJ.') RETURNING id INTO p2w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w3, 1, 'Día A - Potencia Inferior') RETURNING id INTO p2w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w3, 2, 'Día B - Potencia Superior + Sprint') RETURNING id INTO p2w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w3, 3, 'Día C - Hinge + Pliometría Reactiva') RETURNING id INTO p2w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w3d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p2w3d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p2w3d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,5,3,75,'20X0',210,'PRINCIPAL | BB Back Squat: 5x3 @ 75%'),
(p2w3d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3'),
(p2w3d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',5,4,3,null,'10X0',120,'PLIOMETRÍA | Depth Jump: 4x3. Drop 45cm.'),
(p2w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',6,3,6,72.5,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 72.5%'),
(p2w3d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',7,3,10,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(p2w3d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w3d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p2w3d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN'),
(p2w3d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',3,5,3,67.5,'10X0',180,'PRINCIPAL | BB Push Press: 5x3 @ 67.5%'),
(p2w3d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,5,75,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x5 @ 75%'),
(p2w3d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,8,72.5,'21X0',90,'SECUNDARIO | BB Incline Press: 3x8 @ 72.5%'),
(p2w3d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,10,null,null,90,'ACCESORIO | Cable Low Row'),
(p2w3d2,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w3d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p2w3d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,10,null,'20X0',45,'ACTIVACIÓN'),
(p2w3d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,5,3,75,'20X0',210,'PRINCIPAL | BB Conventional Deadlift: 5x3 @ 75%'),
(p2w3d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',4,4,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 4x8'),
(p2w3d3,'00f1de91-dc49-44a5-b488-430c10620a4e',5,3,6,72.5,'31X0',120,'SECUNDARIO | BB RDL: 3x6 @ 72.5%'),
(p2w3d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',6,3,8,75,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 75%'),
(p2w3d3,'25d98192-5707-4db8-ae84-b264eed1394d',7,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p2w3d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,1,1,null,null,0,'VUELTA A LA CALMA');

-- P2 Week 4 DESCARGA
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 4, 'Semana 4 - DESCARGA', 'Descarga activa. 60% 1RM. Reducir volumen 40%. Mantener plyometría liviana.') RETURNING id INTO p2w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w4, 1, 'Día A - DESCARGA Inferior') RETURNING id INTO p2w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w4, 2, 'Día B - DESCARGA Superior') RETURNING id INTO p2w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w4, 3, 'Día C - DESCARGA Hinge') RETURNING id INTO p2w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w4d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',1,2,8,null,null,30,'ACTIVACIÓN | Birddog'),
(p2w4d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',2,3,3,60,'20X0',150,'DESCARGA | BB Back Squat: 3x3 @ 60%. Técnica perfecta.'),
(p2w4d1,'116a15ae-0584-4dea-ba5d-896e706ac376',3,3,3,null,'10X0',120,'PLIOMETRÍA DESCARGA | CMJ: 3x3. Calidad no cantidad.'),
(p2w4d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',4,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w4d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',1,2,12,null,null,30,'ACTIVACIÓN'),
(p2w4d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,3,3,55,'10X0',150,'DESCARGA | BB Push Press: 3x3 @ 55%'),
(p2w4d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,3,4,60,'31X0',120,'DESCARGA | BB Bent Over Row: 3x4 @ 60%'),
(p2w4d2,'192d3181-13ef-45da-84d6-a41c579e6994',4,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w4d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',1,2,10,null,'20X0',45,'ACTIVACIÓN'),
(p2w4d3,'29ebe870-4048-45ab-aa17-4923f25bf096',2,3,3,60,'20X0',150,'DESCARGA | BB Conventional Deadlift: 3x3 @ 60%'),
(p2w4d3,'00f1de91-dc49-44a5-b488-430c10620a4e',3,2,6,60,'31X0',90,'SECUNDARIO | BB RDL: 2x6 @ 60%'),
(p2w4d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',4,1,1,null,null,0,'VUELTA A LA CALMA');

-- P2 Week 5
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 5, 'Semana 5 - Segundo Bloque Potencia', '77.5% 1RM. Depth Jump progresivo. Mayor intensidad pliométrica.') RETURNING id INTO p2w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w5, 1, 'Día A - Potencia Inferior') RETURNING id INTO p2w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w5, 2, 'Día B - Potencia Superior + Sprint') RETURNING id INTO p2w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w5, 3, 'Día C - Hinge + Pliometría Reactiva') RETURNING id INTO p2w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w5d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p2w5d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p2w5d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,5,3,77.5,'20X0',210,'PRINCIPAL | BB Back Squat: 5x3 @ 77.5%'),
(p2w5d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3'),
(p2w5d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',5,5,3,null,'10X0',120,'PLIOMETRÍA | Depth Jump: 5x3. Drop 50cm.'),
(p2w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',6,3,5,75,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x5 @ 75%'),
(p2w5d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,2,30,null,null,60,'ACCESORIO | Plank'),
(p2w5d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w5d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p2w5d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN'),
(p2w5d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',3,5,3,70,'10X0',180,'PRINCIPAL | BB Push Press: 5x3 @ 70%'),
(p2w5d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,5,77.5,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x5 @ 77.5%'),
(p2w5d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,6,75,'21X0',90,'SECUNDARIO | BB Incline Press: 3x6 @ 75%'),
(p2w5d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',6,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(p2w5d2,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w5d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p2w5d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,10,null,'20X0',45,'ACTIVACIÓN'),
(p2w5d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,5,3,77.5,'20X0',210,'PRINCIPAL | BB Conventional Deadlift: 5x3 @ 77.5%'),
(p2w5d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',4,4,10,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 4x10'),
(p2w5d3,'00f1de91-dc49-44a5-b488-430c10620a4e',5,3,5,75,'31X0',120,'SECUNDARIO | BB RDL: 3x5 @ 75%'),
(p2w5d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',6,3,8,77.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 77.5%'),
(p2w5d3,'25d98192-5707-4db8-ae84-b264eed1394d',7,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p2w5d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,1,1,null,null,0,'VUELTA A LA CALMA');

-- P2 Week 6
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 6, 'Semana 6 - Alta Intensidad Pliométrica', '80% 1RM. Alta intensidad plyométrica. Depth Jump máximo.') RETURNING id INTO p2w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w6, 1, 'Día A - Potencia Inferior') RETURNING id INTO p2w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w6, 2, 'Día B - Potencia Superior + Sprint') RETURNING id INTO p2w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w6, 3, 'Día C - Hinge + Pliometría Reactiva') RETURNING id INTO p2w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w6d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p2w6d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p2w6d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,5,2,80,'20X0',210,'PRINCIPAL | BB Back Squat: 5x2 @ 80%. Máxima velocidad concéntrica.'),
(p2w6d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,4,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 4x3'),
(p2w6d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',5,5,3,null,'10X0',150,'PLIOMETRÍA | Depth Jump: 5x3. Drop 55cm.'),
(p2w6d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',6,3,5,77.5,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x5 @ 77.5%'),
(p2w6d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w6d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p2w6d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,5,2,72.5,'10X0',180,'PRINCIPAL | BB Push Press: 5x2 @ 72.5%'),
(p2w6d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,4,4,80,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x4 @ 80%'),
(p2w6d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',4,3,6,77.5,'21X0',90,'SECUNDARIO | BB Incline Press: 3x6 @ 77.5%'),
(p2w6d2,'192d3181-13ef-45da-84d6-a41c579e6994',5,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w6d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p2w6d3,'29ebe870-4048-45ab-aa17-4923f25bf096',2,5,2,80,'20X0',210,'PRINCIPAL | BB Conventional Deadlift: 5x2 @ 80%'),
(p2w6d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',3,4,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 4x8'),
(p2w6d3,'00f1de91-dc49-44a5-b488-430c10620a4e',4,3,5,77.5,'31X0',120,'SECUNDARIO | BB RDL: 3x5 @ 77.5%'),
(p2w6d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,3,6,80,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x6 @ 80%'),
(p2w6d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',6,1,1,null,null,0,'VUELTA A LA CALMA');

-- P2 Week 7 PICO
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 7, 'Semana 7 - PICO DE POTENCIA', '82.5% 1RM. Pico máximo del programa. CMJ + Depth Jump máxima intensidad.') RETURNING id INTO p2w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w7, 1, 'Día A - Potencia Inferior') RETURNING id INTO p2w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w7, 2, 'Día B - Potencia Superior + Sprint') RETURNING id INTO p2w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w7, 3, 'Día C - Hinge + Pliometría Reactiva') RETURNING id INTO p2w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w7d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p2w7d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p2w7d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,2,82.5,'20X0',240,'PRINCIPAL | BB Back Squat: 4x2 @ 82.5%. PICO DEL PROGRAMA.'),
(p2w7d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,4,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 4x3. Máxima expresión.'),
(p2w7d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',5,4,3,null,'10X0',150,'PLIOMETRÍA | Depth Jump: 4x3. Drop máximo 60cm.'),
(p2w7d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',6,2,4,80,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 2x4 @ 80%'),
(p2w7d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w7d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p2w7d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,4,2,75,'10X0',180,'PRINCIPAL | BB Push Press: 4x2 @ 75%. PICO.'),
(p2w7d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,4,4,82.5,'31X0',180,'SECUNDARIO | BB Bent Over Row: 4x4 @ 82.5%'),
(p2w7d2,'192d3181-13ef-45da-84d6-a41c579e6994',4,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w7d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p2w7d3,'29ebe870-4048-45ab-aa17-4923f25bf096',2,4,2,82.5,'20X0',240,'PRINCIPAL | BB Conventional Deadlift: 4x2 @ 82.5%. PICO.'),
(p2w7d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',3,3,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps'),
(p2w7d3,'00f1de91-dc49-44a5-b488-430c10620a4e',4,2,5,80,'31X0',120,'SECUNDARIO | BB RDL: 2x5 @ 80%'),
(p2w7d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,2,6,82.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 2x6 @ 82.5%'),
(p2w7d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',6,1,1,null,null,0,'VUELTA A LA CALMA');

-- P2 Week 8 DESCARGA FINAL
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p2, 8, 'Semana 8 - DESCARGA FINAL', 'Taper. 65% 1RM. Volumen mínimo. Mantener calidad pliométrica.') RETURNING id INTO p2w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w8, 1, 'Día A - DESCARGA') RETURNING id INTO p2w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w8, 2, 'Día B - DESCARGA') RETURNING id INTO p2w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p2w8, 3, 'Día C - DESCARGA') RETURNING id INTO p2w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w8d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,3,65,'20X0',150,'DESCARGA FINAL | Squat 3x3 @ 65%'),
(p2w8d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 3x3. Mantener calidad.'),
(p2w8d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,2,3,null,'10X0',120,'PLIOMETRÍA | Depth Jump: 2x3. Drop 40cm.'),
(p2w8d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',4,1,1,null,null,0,'VUELTA A LA CALMA');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w8d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,3,3,60,'10X0',150,'DESCARGA FINAL | Push Press 3x3 @ 60%'),
(p2w8d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,4,65,'31X0',120,'DESCARGA | Bent Over Row: 3x4 @ 65%'),
(p2w8d2,'192d3181-13ef-45da-84d6-a41c579e6994',3,1,1,null,null,0,'VUELTA A LA CALMA');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p2w8d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,3,65,'20X0',150,'DESCARGA FINAL | Deadlift 3x3 @ 65%'),
(p2w8d3,'00f1de91-dc49-44a5-b488-430c10620a4e',2,2,5,65,'31X0',90,'BB RDL: 2x5 @ 65%'),
(p2w8d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',3,1,1,null,null,0,'VUELTA A LA CALMA');

UPDATE program_products SET duration_weeks = 8 WHERE id = p2;

-- ==================== ATHLETIC PERFORMANCE - WEEKS 2-8 ====================
-- 4-day program: Squat+Speed, Push+COD, Hinge+Conditioning, Unilateral+Mobility

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 2, 'Semana 2 - Adaptación Atlética', 'Incremento 5% en fuerza. Velocidad: aceleración 20m.') RETURNING id INTO p3w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w2, 1, 'Día A - Fuerza Inferior + Velocidad') RETURNING id INTO p3w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w2, 2, 'Día B - Potencia Superior + COD') RETURNING id INTO p3w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w2, 3, 'Día C - Hinge + Pliometría') RETURNING id INTO p3w2d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w2, 4, 'Día D - Unilateral + Movilidad') RETURNING id INTO p3w2d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p3w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p3w2d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,4,70,'31X0',180,'PRINCIPAL | BB Back Squat: 4x4 @ 70%'),
(p3w2d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,4,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 4x3'),
(p3w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,6,70,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 70%'),
(p3w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,30,null,null,60,'ACCESORIO | Plank'),
(p3w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w2d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p3w2d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN'),
(p3w2d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',3,4,4,65,'10X0',180,'PRINCIPAL | BB Push Press: 4x4 @ 65%'),
(p3w2d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,5,72.5,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x5 @ 72.5%'),
(p3w2d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,8,70,'21X0',90,'ACCESORIO | BB Incline Press'),
(p3w2d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',6,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(p3w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w2d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p3w2d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,12,null,'20X0',45,'ACTIVACIÓN'),
(p3w2d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,4,4,70,'31X0',180,'PRINCIPAL | BB Conventional Deadlift: 4x4 @ 70%'),
(p3w2d3,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',4,3,3,null,'10X0',120,'PLIOMETRÍA | Depth Jump: 3x3'),
(p3w2d3,'00f1de91-dc49-44a5-b488-430c10620a4e',5,3,6,70,'31X0',120,'SECUNDARIO | BB RDL: 3x6 @ 70%'),
(p3w2d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',6,3,8,72.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 72.5%'),
(p3w2d3,'25d98192-5707-4db8-ae84-b264eed1394d',7,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p3w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w2d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p3w2d4,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(p3w2d4,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,8,70,'20X0',120,'UNILATERAL | BB Reverse Lunge: 3x8/lado @ 70%'),
(p3w2d4,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',4,3,8,null,null,90,'UNILATERAL | Hip Airplane: 3x8'),
(p3w2d4,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',5,3,30,null,null,60,'CORE | Plank'),
(p3w2d4,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',6,1,1,null,null,0,'VUELTA A LA CALMA');

-- P3 Weeks 3, 4(deload), 5, 6, 7, 8 - simplified structure keeping key exercises
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 3, 'Semana 3 - Desarrollo Atlético', '75% fuerza. Velocidad 30m. Plyometría compleja.') RETURNING id INTO p3w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w3, 1, 'Día A - Fuerza Inferior + Velocidad') RETURNING id INTO p3w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w3, 2, 'Día B - Potencia Superior + COD') RETURNING id INTO p3w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w3, 3, 'Día C - Hinge + Pliometría') RETURNING id INTO p3w3d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w3, 4, 'Día D - Unilateral + Movilidad') RETURNING id INTO p3w3d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w3d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p3w3d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p3w3d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,4,75,'31X0',180,'PRINCIPAL | BB Back Squat: 4x4 @ 75%'),
(p3w3d1,'116a15ae-0584-4dea-ba5d-896e706ac376',4,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3'),
(p3w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,6,72.5,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 72.5%'),
(p3w3d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,35,null,null,60,'ACCESORIO | Plank'),
(p3w3d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w3d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,4,67.5,'10X0',180,'PRINCIPAL | BB Push Press: 4x4 @ 67.5%'),
(p3w3d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,5,75,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x5 @ 75%'),
(p3w3d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,8,72.5,'21X0',90,'ACCESORIO | BB Incline Press'),
(p3w3d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',4,2,15,null,null,60,'ACCESORIO | Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w3d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,4,75,'31X0',180,'PRINCIPAL | BB Conventional Deadlift: 4x4 @ 75%'),
(p3w3d3,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',2,4,3,null,'10X0',120,'PLIOMETRÍA | Depth Jump: 4x3'),
(p3w3d3,'00f1de91-dc49-44a5-b488-430c10620a4e',3,3,6,72.5,'31X0',120,'SECUNDARIO | BB RDL: 3x6 @ 72.5%'),
(p3w3d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',4,3,8,75,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 75%'),
(p3w3d3,'25d98192-5707-4db8-ae84-b264eed1394d',5,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w3d4,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,3,8,72.5,'20X0',120,'UNILATERAL | BB Reverse Lunge: 3x8/lado @ 72.5%'),
(p3w3d4,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,3,8,null,null,90,'Hip Airplane: 3x8'),
(p3w3d4,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',3,3,35,null,null,60,'CORE | Plank: 3x35s');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 4, 'Semana 4 - DESCARGA', 'Descarga activa. 60% fuerza. Velocidad técnica liviana.') RETURNING id INTO p3w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w4, 1, 'Día A - DESCARGA') RETURNING id INTO p3w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w4, 2, 'Día B - DESCARGA') RETURNING id INTO p3w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w4, 3, 'Día C - DESCARGA') RETURNING id INTO p3w4d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w4, 4, 'Día D - DESCARGA Movilidad') RETURNING id INTO p3w4d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w4d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,3,60,'31X0',150,'DESCARGA | Squat: 3x3 @ 60%'),
(p3w4d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',90,'PLIOMETRÍA DESCARGA | CMJ: 3x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w4d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,3,3,55,'10X0',150,'DESCARGA | Push Press: 3x3 @ 55%'),
(p3w4d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,4,60,'31X0',120,'DESCARGA | Bent Over Row: 3x4 @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w4d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,3,60,'31X0',150,'DESCARGA | Deadlift: 3x3 @ 60%'),
(p3w4d3,'00f1de91-dc49-44a5-b488-430c10620a4e',2,2,5,60,'31X0',90,'BB RDL: 2x5 @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w4d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,10,null,null,30,'MOVILIDAD completa. Recuperación activa.');

-- P3 Weeks 5-8 (progression 77.5->80->82.5->deload)
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 5, 'Semana 5 - Reanudación Intensa', 'Segundo bloque. 77.5% fuerza. COD con resistencia.') RETURNING id INTO p3w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w5, 1, 'Día A - Fuerza + Velocidad') RETURNING id INTO p3w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w5, 2, 'Día B - Potencia Superior + COD') RETURNING id INTO p3w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w5, 3, 'Día C - Hinge + Pliometría') RETURNING id INTO p3w5d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w5, 4, 'Día D - Unilateral') RETURNING id INTO p3w5d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w5d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,3,77.5,'31X0',180,'PRINCIPAL | Squat: 4x3 @ 77.5%'),
(p3w5d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3'),
(p3w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,6,75,'20X0',120,'SECUNDARIO | Lunge: 3x6 @ 75%'),
(p3w5d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,40,null,null,60,'Plank 3x40s');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w5d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,3,70,'10X0',180,'PRINCIPAL | Push Press: 4x3 @ 70%'),
(p3w5d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,5,77.5,'31X0',150,'Bent Over Row: 4x5 @ 77.5%'),
(p3w5d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,6,75,'21X0',90,'Incline Press: 3x6 @ 75%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w5d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,3,77.5,'31X0',180,'PRINCIPAL | Deadlift: 4x3 @ 77.5%'),
(p3w5d3,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',2,4,3,null,'10X0',120,'Depth Jump: 4x3'),
(p3w5d3,'00f1de91-dc49-44a5-b488-430c10620a4e',3,3,5,75,'31X0',120,'BB RDL: 3x5 @ 75%'),
(p3w5d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',4,3,8,77.5,'21X1',90,'Hip Thrust: 3x8 @ 77.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w5d4,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,3,6,75,'20X0',120,'UNILATERAL | Lunge: 3x6/lado @ 75%'),
(p3w5d4,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,3,8,null,null,90,'Hip Airplane');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 6, 'Semana 6 - Alta Performance', '80% fuerza. Plyometría avanzada. COD competitivo.') RETURNING id INTO p3w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w6, 1, 'Día A - Fuerza + Velocidad') RETURNING id INTO p3w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w6, 2, 'Día B - Potencia Superior + COD') RETURNING id INTO p3w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w6, 3, 'Día C - Hinge + Pliometría') RETURNING id INTO p3w6d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w6, 4, 'Día D - Unilateral') RETURNING id INTO p3w6d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w6d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,3,80,'31X0',210,'PRINCIPAL | Squat: 4x3 @ 80%'),
(p3w6d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',120,'CMJ: 4x3'),
(p3w6d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,5,77.5,'20X0',120,'Lunge: 3x5 @ 77.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w6d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,3,72.5,'10X0',180,'Push Press: 4x3 @ 72.5%'),
(p3w6d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,4,80,'31X0',150,'Bent Over Row: 4x4 @ 80%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w6d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,3,80,'31X0',210,'Deadlift: 4x3 @ 80%'),
(p3w6d3,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',2,4,3,null,'10X0',120,'Depth Jump: 4x3'),
(p3w6d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',3,3,6,80,'21X1',90,'Hip Thrust: 3x6 @ 80%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w6d4,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,3,5,77.5,'20X0',120,'Lunge: 3x5 @ 77.5%'),
(p3w6d4,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,3,8,null,null,90,'Hip Airplane');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 7, 'Semana 7 - PICO ATLÉTICO', 'Máximo rendimiento. 82.5% fuerza. Sprint máximo. Plyometría máxima intensidad.') RETURNING id INTO p3w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w7, 1, 'Día A - PICO Inferior') RETURNING id INTO p3w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w7, 2, 'Día B - PICO Superior') RETURNING id INTO p3w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w7, 3, 'Día C - PICO Hinge') RETURNING id INTO p3w7d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w7, 4, 'Día D - PICO Unilateral') RETURNING id INTO p3w7d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w7d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,2,82.5,'31X0',240,'PICO | Squat: 5x2 @ 82.5%'),
(p3w7d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',120,'CMJ: 4x3. Máxima expresión'),
(p3w7d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,3,3,null,'10X0',150,'Depth Jump: 3x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w7d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,5,2,75,'10X0',210,'PICO | Push Press: 5x2 @ 75%'),
(p3w7d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,4,82.5,'31X0',180,'Bent Over Row: 4x4 @ 82.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w7d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,2,82.5,'31X0',240,'PICO | Deadlift: 5x2 @ 82.5%'),
(p3w7d3,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',2,4,3,null,'10X0',150,'Depth Jump: 4x3'),
(p3w7d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',3,2,5,82.5,'21X1',90,'Hip Thrust: 2x5 @ 82.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w7d4,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,3,4,80,'20X0',120,'Lunge: 3x4 @ 80%'),
(p3w7d4,'25d98192-5707-4db8-ae84-b264eed1394d',2,3,5,null,'4010',90,'AB GHR ECC Drop');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p3, 8, 'Semana 8 - DESCARGA FINAL', 'Taper. 65% fuerza. Consolidación. Evaluar mejoras.') RETURNING id INTO p3w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w8, 1, 'Día A - DESCARGA') RETURNING id INTO p3w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w8, 2, 'Día B - DESCARGA') RETURNING id INTO p3w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w8, 3, 'Día C - DESCARGA') RETURNING id INTO p3w8d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p3w8, 4, 'Día D - DESCARGA Activa') RETURNING id INTO p3w8d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w8d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,4,65,'31X0',150,'DESCARGA FINAL | Squat: 3x4 @ 65%'),
(p3w8d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',90,'CMJ: 3x3 mantenimiento');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w8d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,3,3,60,'10X0',150,'Push Press: 3x3 @ 60%'),
(p3w8d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,4,65,'31X0',120,'Bent Over Row: 3x4 @ 65%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w8d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,3,65,'31X0',150,'Deadlift: 3x3 @ 65%'),
(p3w8d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,2,6,65,'21X1',90,'Hip Thrust: 2x6 @ 65%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p3w8d4,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,3,10,null,null,30,'MOVILIDAD completa. Evaluación final de programa.');

UPDATE program_products SET duration_weeks = 8 WHERE id IN (p2, p3);

END $$;
