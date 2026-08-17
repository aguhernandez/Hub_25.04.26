/*
  # Foundation Strength - Semanas 2-8 con Progresión
  
  Programa: Foundation Strength (8 semanas, Principiante)
  ID: 1f52d75a-9bd3-4556-84f8-67ecee1540c6
  
  Estructura de periodización:
  - Semana 1: 60% (base - ya insertada)
  - Semana 2: 65% - Adaptación
  - Semana 3: 70% - Desarrollo
  - Semana 4: 55% DESCARGA - Recuperación
  - Semana 5: 70% - Reanudación
  - Semana 6: 75% - Intensificación
  - Semana 7: 77.5% - Pico
  - Semana 8: 60% DESCARGA FINAL - Consolidación
*/

DO $$
DECLARE
  prog_id uuid := '1f52d75a-9bd3-4556-84f8-67ecee1540c6';
  w2 uuid; w3 uuid; w4 uuid; w5 uuid; w6 uuid; w7 uuid; w8 uuid;
  -- Week 2 days
  w2d1 uuid; w2d2 uuid; w2d3 uuid;
  -- Week 3 days
  w3d1 uuid; w3d2 uuid; w3d3 uuid;
  -- Week 4 days (deload)
  w4d1 uuid; w4d2 uuid; w4d3 uuid;
  -- Week 5 days
  w5d1 uuid; w5d2 uuid; w5d3 uuid;
  -- Week 6 days
  w6d1 uuid; w6d2 uuid; w6d3 uuid;
  -- Week 7 days
  w7d1 uuid; w7d2 uuid; w7d3 uuid;
  -- Week 8 days (deload)
  w8d1 uuid; w8d2 uuid; w8d3 uuid;
BEGIN

-- ===================== WEEK 2 =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 2, 'Semana 2 - Adaptación', 'Incremento de carga +5%. Consolidar patrones técnicos.')
RETURNING id INTO w2;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w2, 1, 'Día A - Tren Inferior (Squat)', 'Squat 65% 1RM') RETURNING id INTO w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w2, 2, 'Día B - Tren Superior', 'Press + Row 65%') RETURNING id INTO w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w2, 3, 'Día C - Tren Inferior (Hinge)', 'Deadlift 70%') RETURNING id INTO w2d3;

-- Day A W2
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(w2d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(w2d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',4,2,15,null,null,30,'ACTIVACIÓN | Hip Abduction'),
(w2d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',5,4,6,65,'31X0',180,'PRINCIPAL | BB Back Squat: 4x6 @ 65% 1RM. +5% respecto semana 1.'),
(w2d1,'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc',6,3,5,null,'10X0',90,'PLIOMETRÍA | Box Jump CON: 3x5. Aterrizaje controlado.'),
(w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',7,3,8,65,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x8/lado @ 65%'),
(w2d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',8,3,12,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC: 3x12'),
(w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',9,3,30,null,null,60,'ACCESORIO | Plank: 3x30s'),
(w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',10,1,1,null,null,0,'VUELTA A LA CALMA | Stretching 5-8 min');

-- Day B W2
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w2d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(w2d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(w2d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,4,6,65,'31X0',180,'PRINCIPAL | BB Bench Press: 4x6 @ 65% 1RM'),
(w2d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,6,65,'31X0',180,'PRINCIPAL | BB Bent Over Row: 4x6 @ 65% 1RM'),
(w2d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,10,65,'21X0',90,'SECUNDARIO | BB Incline Press: 3x10 @ 65%'),
(w2d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,12,null,'21X0',90,'SECUNDARIO | Cable Low Row: 3x12'),
(w2d2,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',7,3,10,null,'20X0',60,'ACCESORIO | BW Dips: 3x10'),
(w2d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',8,3,15,null,null,60,'ACCESORIO | Cable Face Pull: 3x15'),
(w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',9,2,10,null,null,0,'VUELTA A LA CALMA | Shoulder Flexion');

-- Day C W2
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w2d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor Stretch'),
(w2d3,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(w2d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',3,3,12,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w2d3,'29ebe870-4048-45ab-aa17-4923f25bf096',4,4,5,70,'31X0',180,'PRINCIPAL | BB Conventional Deadlift: 4x5 @ 70% 1RM'),
(w2d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',5,3,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 3x8'),
(w2d3,'00f1de91-dc49-44a5-b488-430c10620a4e',6,3,8,65,'31X0',120,'SECUNDARIO | BB RDL: 3x8 @ 65%'),
(w2d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',7,3,10,70,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x10 @ 70%'),
(w2d3,'25d98192-5707-4db8-ae84-b264eed1394d',8,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop: 3x8'),
(w2d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',9,2,15,null,null,45,'ACCESORIO | Banded X-Walk'),
(w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',10,2,8,null,null,0,'VUELTA A LA CALMA | Hamstring Stretch');

-- ===================== WEEK 3 =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 3, 'Semana 3 - Desarrollo', 'Intensidad 70-72%. Mayor demanda neuromuscular.')
RETURNING id INTO w3;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w3, 1, 'Día A - Tren Inferior (Squat)', 'Squat 70%') RETURNING id INTO w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w3, 2, 'Día B - Tren Superior', 'Press + Row 70%') RETURNING id INTO w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w3, 3, 'Día C - Tren Inferior (Hinge)', 'Deadlift 72.5%') RETURNING id INTO w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w3d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(w3d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(w3d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(w3d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',4,2,15,null,null,30,'ACTIVACIÓN | Hip Abduction'),
(w3d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',5,4,5,70,'31X0',180,'PRINCIPAL | BB Back Squat: 4x5 @ 70% 1RM. Reducir rep, aumentar carga.'),
(w3d1,'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc',6,3,5,null,'10X0',90,'PLIOMETRÍA | Box Jump CON: 3x5'),
(w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',7,3,8,70,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x8/lado @ 70%'),
(w3d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',8,3,10,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC: 3x10 (mayor dificultad)'),
(w3d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',9,3,40,null,null,60,'ACCESORIO | Plank: 3x40s'),
(w3d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',10,1,1,null,null,0,'VUELTA A LA CALMA | Stretching');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w3d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(w3d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(w3d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,4,5,70,'31X0',180,'PRINCIPAL | BB Bench Press: 4x5 @ 70% 1RM'),
(w3d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,5,70,'31X0',180,'PRINCIPAL | BB Bent Over Row: 4x5 @ 70% 1RM'),
(w3d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,8,70,'21X0',90,'SECUNDARIO | BB Incline Press: 3x8 @ 70%'),
(w3d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,12,null,'21X0',90,'SECUNDARIO | Cable Low Row: 3x12'),
(w3d2,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',7,3,10,null,'20X0',60,'ACCESORIO | BW Dips'),
(w3d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',8,3,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(w3d2,'192d3181-13ef-45da-84d6-a41c579e6994',9,2,10,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w3d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(w3d3,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(w3d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',3,3,12,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w3d3,'29ebe870-4048-45ab-aa17-4923f25bf096',4,4,5,72.5,'31X0',180,'PRINCIPAL | BB Conventional Deadlift: 4x5 @ 72.5% 1RM'),
(w3d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',5,3,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps'),
(w3d3,'00f1de91-dc49-44a5-b488-430c10620a4e',6,3,8,67.5,'31X0',120,'SECUNDARIO | BB RDL: 3x8 @ 67.5%'),
(w3d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',7,3,10,72.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x10 @ 72.5%'),
(w3d3,'25d98192-5707-4db8-ae84-b264eed1394d',8,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(w3d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',9,2,15,null,null,45,'ACCESORIO | Banded X-Walk'),
(w3d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',10,2,8,null,null,0,'VUELTA A LA CALMA');

-- ===================== WEEK 4 - DESCARGA =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 4, 'Semana 4 - DESCARGA', 'Semana de descarga. Volumen -40%, intensidad 55-60%. Recuperación activa y consolidación.')
RETURNING id INTO w4;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w4, 1, 'Día A - Tren Inferior (Squat)', 'DESCARGA - Squat 55%') RETURNING id INTO w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w4, 2, 'Día B - Tren Superior', 'DESCARGA - 55%') RETURNING id INTO w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w4, 3, 'Día C - Tren Inferior (Hinge)', 'DESCARGA - Deadlift 55%') RETURNING id INTO w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w4d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,8,null,null,30,'MOVILIDAD | 90-90'),
(w4d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,8,null,null,30,'ACTIVACIÓN | Birddog'),
(w4d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,3,5,55,'31X0',150,'PRINCIPAL DESCARGA | BB Back Squat: 3x5 @ 55%. Foco técnico total.'),
(w4d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',4,2,6,55,'20X0',90,'SECUNDARIO | BB Reverse Lunge: 2x6 @ 55%'),
(w4d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',5,2,30,null,null,60,'ACCESORIO | Plank: 2x30s'),
(w4d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',6,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w4d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(w4d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,2,12,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(w4d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,3,5,55,'31X0',150,'PRINCIPAL DESCARGA | BB Bench Press: 3x5 @ 55%'),
(w4d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,3,5,55,'31X0',150,'PRINCIPAL DESCARGA | BB Bent Over Row: 3x5 @ 55%'),
(w4d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,2,12,null,null,60,'ACCESORIO | Cable Face Pull'),
(w4d2,'192d3181-13ef-45da-84d6-a41c579e6994',6,2,10,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w4d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(w4d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,2,10,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w4d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,3,4,55,'31X0',150,'PRINCIPAL DESCARGA | BB Conventional Deadlift: 3x4 @ 55%'),
(w4d3,'00f1de91-dc49-44a5-b488-430c10620a4e',4,2,8,55,'31X0',90,'SECUNDARIO | BB RDL: 2x8 @ 55%'),
(w4d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,2,8,55,'21X1',90,'SECUNDARIO | BB Hip Thrust: 2x8 @ 55%'),
(w4d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',6,2,8,null,null,0,'VUELTA A LA CALMA');

-- ===================== WEEK 5 =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 5, 'Semana 5 - Reanudación', 'Segundo bloque. Volver a 70%. Incrementar volumen de accesorios.')
RETURNING id INTO w5;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w5, 1, 'Día A - Tren Inferior (Squat)', 'Squat 70%') RETURNING id INTO w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w5, 2, 'Día B - Tren Superior', '70%') RETURNING id INTO w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w5, 3, 'Día C - Tren Inferior (Hinge)', 'Deadlift 72.5%') RETURNING id INTO w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w5d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(w5d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(w5d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(w5d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',4,2,15,null,null,30,'ACTIVACIÓN | Hip Abduction'),
(w5d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',5,4,5,70,'31X0',180,'PRINCIPAL | BB Back Squat: 4x5 @ 70%. Segundo bloque, calidad técnica máxima.'),
(w5d1,'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc',6,4,5,null,'10X0',90,'PLIOMETRÍA | Box Jump CON: 4x5. Serie extra respecto bloque 1.'),
(w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',7,3,8,70,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x8/lado @ 70%'),
(w5d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',8,3,12,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(w5d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',9,3,40,null,null,60,'ACCESORIO | Plank: 3x40s'),
(w5d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',10,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w5d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(w5d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(w5d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,4,5,70,'31X0',180,'PRINCIPAL | BB Bench Press: 4x5 @ 70%'),
(w5d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,5,70,'31X0',180,'PRINCIPAL | BB Bent Over Row: 4x5 @ 70%'),
(w5d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,8,70,'21X0',90,'SECUNDARIO | BB Incline Press: 3x8 @ 70%'),
(w5d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,12,null,'21X0',90,'SECUNDARIO | Cable Low Row'),
(w5d2,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',7,3,10,null,'20X0',60,'ACCESORIO | BW Dips'),
(w5d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',8,3,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(w5d2,'192d3181-13ef-45da-84d6-a41c579e6994',9,2,10,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w5d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(w5d3,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(w5d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',3,3,12,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w5d3,'29ebe870-4048-45ab-aa17-4923f25bf096',4,4,5,72.5,'31X0',180,'PRINCIPAL | BB Conventional Deadlift: 4x5 @ 72.5%'),
(w5d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',5,3,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps'),
(w5d3,'00f1de91-dc49-44a5-b488-430c10620a4e',6,3,8,67.5,'31X0',120,'SECUNDARIO | BB RDL: 3x8 @ 67.5%'),
(w5d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',7,3,10,72.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x10 @ 72.5%'),
(w5d3,'25d98192-5707-4db8-ae84-b264eed1394d',8,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(w5d3,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',9,2,15,null,null,45,'ACCESORIO | Banded X-Walk'),
(w5d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',10,2,8,null,null,0,'VUELTA A LA CALMA');

-- ===================== WEEK 6 =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 6, 'Semana 6 - Intensificación', 'Intensidad 75%. Consolidar fuerza para pico final.')
RETURNING id INTO w6;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w6, 1, 'Día A - Tren Inferior (Squat)', 'Squat 75%') RETURNING id INTO w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w6, 2, 'Día B - Tren Superior', '75%') RETURNING id INTO w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w6, 3, 'Día C - Tren Inferior (Hinge)', 'Deadlift 77.5%') RETURNING id INTO w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w6d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(w6d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(w6d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,4,75,'31X0',180,'PRINCIPAL | BB Back Squat: 4x4 @ 75% 1RM. Pico de intensidad bloque 2.'),
(w6d1,'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc',4,4,5,null,'10X0',90,'PLIOMETRÍA | Box Jump CON: 4x5'),
(w6d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,6,72.5,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 72.5%'),
(w6d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',6,3,10,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(w6d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,3,45,null,null,60,'ACCESORIO | Plank: 3x45s'),
(w6d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w6d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(w6d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(w6d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,4,4,75,'31X0',180,'PRINCIPAL | BB Bench Press: 4x4 @ 75%'),
(w6d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,4,4,75,'31X0',180,'PRINCIPAL | BB Bent Over Row: 4x4 @ 75%'),
(w6d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,8,72.5,'21X0',90,'SECUNDARIO | BB Incline Press: 3x8 @ 72.5%'),
(w6d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,12,null,'21X0',90,'SECUNDARIO | Cable Low Row'),
(w6d2,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',7,3,10,null,'20X0',60,'ACCESORIO | BW Dips'),
(w6d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',8,3,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(w6d2,'192d3181-13ef-45da-84d6-a41c579e6994',9,2,10,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w6d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(w6d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,12,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w6d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,4,4,77.5,'31X0',180,'PRINCIPAL | BB Conventional Deadlift: 4x4 @ 77.5%'),
(w6d3,'00f1de91-dc49-44a5-b488-430c10620a4e',4,3,6,70,'31X0',120,'SECUNDARIO | BB RDL: 3x6 @ 70%'),
(w6d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,3,8,75,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 75%'),
(w6d3,'25d98192-5707-4db8-ae84-b264eed1394d',6,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(w6d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,2,8,null,null,0,'VUELTA A LA CALMA');

-- ===================== WEEK 7 - PICO =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 7, 'Semana 7 - Pico de Fuerza', 'Máxima intensidad del programa. 77.5-80% 1RM. Volumen moderado.')
RETURNING id INTO w7;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w7, 1, 'Día A - Tren Inferior (Squat)', 'Squat 77.5%') RETURNING id INTO w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w7, 2, 'Día B - Tren Superior', '77.5%') RETURNING id INTO w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w7, 3, 'Día C - Tren Inferior (Hinge)', 'Deadlift 80%') RETURNING id INTO w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w7d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(w7d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(w7d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,5,3,77.5,'31X0',210,'PRINCIPAL | BB Back Squat: 5x3 @ 77.5% 1RM. Pico del programa.'),
(w7d1,'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc',4,4,4,null,'10X0',90,'PLIOMETRÍA | Box Jump CON: 4x4. Reducir reps, máxima expresión.'),
(w7d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,6,75,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 75%'),
(w7d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,45,null,null,60,'ACCESORIO | Plank: 3x45s'),
(w7d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w7d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(w7d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,12,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(w7d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,5,3,77.5,'31X0',210,'PRINCIPAL | BB Bench Press: 5x3 @ 77.5%'),
(w7d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,5,3,77.5,'31X0',210,'PRINCIPAL | BB Bent Over Row: 5x3 @ 77.5%'),
(w7d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,6,75,'21X0',90,'SECUNDARIO | BB Incline Press: 3x6 @ 75%'),
(w7d2,'94e11eb6-9fee-4116-a873-0001d041027b',6,3,10,null,'21X0',90,'SECUNDARIO | Cable Low Row'),
(w7d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',7,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(w7d2,'192d3181-13ef-45da-84d6-a41c579e6994',8,2,10,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w7d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(w7d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,10,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w7d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,5,3,80,'31X0',210,'PRINCIPAL | BB Conventional Deadlift: 5x3 @ 80% 1RM. Máxima del programa.'),
(w7d3,'00f1de91-dc49-44a5-b488-430c10620a4e',4,3,5,72.5,'31X0',120,'SECUNDARIO | BB RDL: 3x5 @ 72.5%'),
(w7d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,3,8,77.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 77.5%'),
(w7d3,'25d98192-5707-4db8-ae84-b264eed1394d',6,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop: 3x6'),
(w7d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,2,8,null,null,0,'VUELTA A LA CALMA');

-- ===================== WEEK 8 - DESCARGA FINAL =====================
INSERT INTO program_weeks (program_product_id, week_number, title, description)
VALUES (prog_id, 8, 'Semana 8 - DESCARGA FINAL', 'Semana de taper y consolidación. 60% 1RM, volumen reducido. Preparar el cuerpo para el siguiente ciclo.')
RETURNING id INTO w8;

INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w8, 1, 'Día A - Tren Inferior (Squat)', 'DESCARGA - 60%') RETURNING id INTO w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w8, 2, 'Día B - Tren Superior', 'DESCARGA - 60%') RETURNING id INTO w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name, notes) VALUES (w8, 3, 'Día C - Tren Inferior (Hinge)', 'DESCARGA - 60%') RETURNING id INTO w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w8d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(w8d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(w8d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,3,5,60,'31X0',150,'PRINCIPAL DESCARGA FINAL | BB Back Squat: 3x5 @ 60%. Técnica perfecta. Evaluar progreso.'),
(w8d1,'e319c2d1-b0ac-4c37-bf93-7dbe5ee054cc',4,2,5,null,'10X0',90,'PLIOMETRÍA | Box Jump CON: 2x5. Mantenimiento.'),
(w8d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,2,6,60,'20X0',90,'SECUNDARIO | BB Reverse Lunge: 2x6 @ 60%'),
(w8d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',6,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w8d2,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(w8d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,2,12,null,null,30,'ACTIVACIÓN'),
(w8d2,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,3,5,60,'31X0',150,'PRINCIPAL DESCARGA FINAL | BB Bench Press: 3x5 @ 60%'),
(w8d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,3,5,60,'31X0',150,'PRINCIPAL DESCARGA FINAL | BB Bent Over Row: 3x5 @ 60%'),
(w8d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(w8d2,'192d3181-13ef-45da-84d6-a41c579e6994',6,2,10,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(w8d3,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(w8d3,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,2,10,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(w8d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,3,4,60,'31X0',150,'PRINCIPAL DESCARGA FINAL | BB Conventional Deadlift: 3x4 @ 60%'),
(w8d3,'00f1de91-dc49-44a5-b488-430c10620a4e',4,2,6,60,'31X0',90,'SECUNDARIO | BB RDL: 2x6 @ 60%'),
(w8d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,2,8,60,'21X1',90,'SECUNDARIO | BB Hip Thrust: 2x8 @ 60%'),
(w8d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',6,2,8,null,null,0,'VUELTA A LA CALMA');

-- Update duration to 8 weeks
UPDATE program_products SET duration_weeks = 8 WHERE id = prog_id;

END $$;
