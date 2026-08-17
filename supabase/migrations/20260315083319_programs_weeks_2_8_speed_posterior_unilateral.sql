/*
  # Speed & Agility + Posterior Chain + Unilateral Strength - Semanas 2-8
  
  Programa 6: Speed & Agility (6df21452) - Descarga semana 4
  Programa 7: Posterior Chain Dominant (b6679d57) - Descarga semana 4
  Programa 8: Unilateral Strength (91dcf9a1) - Descarga semana 4
*/

DO $$
DECLARE
  p6 uuid := '6df21452-b1db-4273-ad6d-33edc4f74a06';
  p7 uuid := 'b6679d57-3547-4447-8b96-7fd0f7da4cca';
  p8 uuid := '91dcf9a1-9f1f-47d8-b9d5-5074c307d254';
  
  -- P6 weeks
  p6w2 uuid; p6w3 uuid; p6w4 uuid; p6w5 uuid; p6w6 uuid; p6w7 uuid; p6w8 uuid;
  p6w2d1 uuid; p6w2d2 uuid; p6w2d3 uuid;
  p6w3d1 uuid; p6w3d2 uuid; p6w3d3 uuid;
  p6w4d1 uuid; p6w4d2 uuid; p6w4d3 uuid;
  p6w5d1 uuid; p6w5d2 uuid; p6w5d3 uuid;
  p6w6d1 uuid; p6w6d2 uuid; p6w6d3 uuid;
  p6w7d1 uuid; p6w7d2 uuid; p6w7d3 uuid;
  p6w8d1 uuid; p6w8d2 uuid; p6w8d3 uuid;
  
  -- P7 weeks
  p7w2 uuid; p7w3 uuid; p7w4 uuid; p7w5 uuid; p7w6 uuid; p7w7 uuid; p7w8 uuid;
  p7w2d1 uuid; p7w2d2 uuid; p7w2d3 uuid;
  p7w3d1 uuid; p7w3d2 uuid; p7w3d3 uuid;
  p7w4d1 uuid; p7w4d2 uuid; p7w4d3 uuid;
  p7w5d1 uuid; p7w5d2 uuid; p7w5d3 uuid;
  p7w6d1 uuid; p7w6d2 uuid; p7w6d3 uuid;
  p7w7d1 uuid; p7w7d2 uuid; p7w7d3 uuid;
  p7w8d1 uuid; p7w8d2 uuid; p7w8d3 uuid;
  
  -- P8 weeks
  p8w2 uuid; p8w3 uuid; p8w4 uuid; p8w5 uuid; p8w6 uuid; p8w7 uuid; p8w8 uuid;
  p8w2d1 uuid; p8w2d2 uuid; p8w2d3 uuid;
  p8w3d1 uuid; p8w3d2 uuid; p8w3d3 uuid;
  p8w4d1 uuid; p8w4d2 uuid; p8w4d3 uuid;
  p8w5d1 uuid; p8w5d2 uuid; p8w5d3 uuid;
  p8w6d1 uuid; p8w6d2 uuid; p8w6d3 uuid;
  p8w7d1 uuid; p8w7d2 uuid; p8w7d3 uuid;
  p8w8d1 uuid; p8w8d2 uuid; p8w8d3 uuid;
BEGIN

-- ==================== SPEED & AGILITY - WEEKS 2-8 ====================
-- Periodización: S1=70% base, S2=72.5%, S3=75%, S4=DESCARGA, S5=77.5%, S6=80%, S7=82.5% PICO, S8=DESCARGA FINAL

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 2, 'Semana 2 - Aceleración + Fuerza', '72.5%. Aceleración 20-30m. COD 45°. Sled progresivo.') RETURNING id INTO p6w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w2,1,'Día A - Aceleración + Fuerza') RETURNING id INTO p6w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w2,2,'Día B - COD + Potencia Superior') RETURNING id INTO p6w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w2,3,'Día C - Velocidad Máxima + Sled') RETURNING id INTO p6w2d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(p6w2d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(p6w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(p6w2d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',4,4,4,72.5,'20X0',210,'PRINCIPAL | BB Back Squat: 4x4 @ 72.5%. Concentrico explosivo.'),
(p6w2d1,'116a15ae-0584-4dea-ba5d-896e706ac376',5,4,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 4x3. Potenciación post-activación.'),
(p6w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',6,3,6,72.5,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x6 @ 72.5%'),
(p6w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',7,3,30,null,null,60,'CORE | Plank'),
(p6w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w2d2,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p6w2d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,4,4,65,'10X0',180,'PRINCIPAL | BB Push Press: 4x4 @ 65%'),
(p6w2d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,4,5,72.5,'31X0',150,'SECUNDARIO | BB Bent Over Row: 4x5 @ 72.5%'),
(p6w2d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',4,3,8,70,'21X0',90,'ACCESORIO | BB Incline Press'),
(p6w2d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,2,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(p6w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',6,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w2d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,8,null,null,30,'MOVILIDAD'),
(p6w2d3,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(p6w2d3,'29ebe870-4048-45ab-aa17-4923f25bf096',3,4,4,72.5,'20X0',210,'PRINCIPAL | BB Conventional Deadlift: 4x4 @ 72.5%'),
(p6w2d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',4,4,10,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps: 4x10'),
(p6w2d3,'00f1de91-dc49-44a5-b488-430c10620a4e',5,3,6,70,'31X0',120,'SECUNDARIO | BB RDL: 3x6 @ 70%'),
(p6w2d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',6,3,8,72.5,'21X1',90,'SECUNDARIO | BB Hip Thrust: 3x8 @ 72.5%'),
(p6w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,1,1,null,null,0,'VUELTA A LA CALMA');

-- P6 Weeks 3-8
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 3, 'Semana 3 - Velocidad + Fuerza', '75%. Sprint 30m. COD 90°. Alta potencia.') RETURNING id INTO p6w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w3,1,'Día A - Aceleración + Fuerza') RETURNING id INTO p6w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w3,2,'Día B - COD + Potencia Superior') RETURNING id INTO p6w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w3,3,'Día C - Velocidad Máxima + Sled') RETURNING id INTO p6w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w3d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,3,75,'20X0',210,'PRINCIPAL | BB Back Squat: 5x3 @ 75%'),
(p6w3d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,5,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 5x3'),
(p6w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,6,72.5,'20X0',120,'BB Reverse Lunge: 3x6 @ 72.5%'),
(p6w3d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,35,null,null,60,'Plank');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w3d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,4,67.5,'10X0',180,'BB Push Press: 4x4 @ 67.5%'),
(p6w3d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,5,75,'31X0',150,'BB Bent Over Row: 4x5 @ 75%'),
(p6w3d2,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,8,72.5,'21X0',90,'BB Incline Press');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w3d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,3,75,'20X0',210,'BB Conventional Deadlift: 5x3 @ 75%'),
(p6w3d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,4,10,null,'10X0',90,'Ankle Jumps'),
(p6w3d3,'00f1de91-dc49-44a5-b488-430c10620a4e',3,3,5,72.5,'31X0',120,'BB RDL: 3x5 @ 72.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 4, 'Semana 4 - DESCARGA', 'Descarga activa. 60%. Velocidad técnica liviana. Recuperación del SNC.') RETURNING id INTO p6w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w4,1,'Día A - DESCARGA') RETURNING id INTO p6w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w4,2,'Día B - DESCARGA') RETURNING id INTO p6w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w4,3,'Día C - DESCARGA') RETURNING id INTO p6w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w4d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,3,60,'20X0',150,'DESCARGA | Squat: 3x3 @ 60%'),
(p6w4d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',90,'CMJ: 3x3. Calidad.');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w4d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,3,3,55,'10X0',150,'Push Press: 3x3 @ 55%'),
(p6w4d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,4,60,'31X0',120,'Bent Over Row: 3x4 @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w4d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,3,60,'20X0',150,'Deadlift: 3x3 @ 60%'),
(p6w4d3,'00f1de91-dc49-44a5-b488-430c10620a4e',2,2,5,60,'31X0',90,'BB RDL: 2x5 @ 60%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 5, 'Semana 5 - Velocidad + Fuerza II', '77.5%. Sprint 40m + volado 10m. Sled pesado.') RETURNING id INTO p6w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w5,1,'Día A - Aceleración + Fuerza') RETURNING id INTO p6w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w5,2,'Día B - COD + Potencia Superior') RETURNING id INTO p6w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w5,3,'Día C - Velocidad Máxima + Sled') RETURNING id INTO p6w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w5d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,3,77.5,'20X0',210,'BB Back Squat: 5x3 @ 77.5%'),
(p6w5d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,5,3,null,'10X0',120,'CMJ: 5x3'),
(p6w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,5,75,'20X0',120,'BB Reverse Lunge: 3x5 @ 75%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w5d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,4,70,'10X0',180,'BB Push Press: 4x4 @ 70%'),
(p6w5d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,4,77.5,'31X0',150,'Bent Over Row: 4x4 @ 77.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w5d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,3,77.5,'20X0',210,'Deadlift: 5x3 @ 77.5%'),
(p6w5d3,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,4,10,null,'10X0',90,'Ankle Jumps'),
(p6w5d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',3,3,6,77.5,'21X1',90,'Hip Thrust: 3x6 @ 77.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 6, 'Semana 6 - Alta Velocidad + Fuerza', '80%. Sprint máximo. COD competitivo.') RETURNING id INTO p6w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w6,1,'Día A - Aceleración + Fuerza') RETURNING id INTO p6w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w6,2,'Día B - COD + Potencia Superior') RETURNING id INTO p6w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w6,3,'Día C - Velocidad Máxima + Sled') RETURNING id INTO p6w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w6d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,3,80,'20X0',210,'BB Back Squat: 4x3 @ 80%'),
(p6w6d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',120,'CMJ: 4x3'),
(p6w6d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,3,3,null,'10X0',150,'Depth Jump: 3x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w6d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,4,3,72.5,'10X0',180,'Push Press: 4x3 @ 72.5%'),
(p6w6d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,4,80,'31X0',150,'Bent Over Row: 4x4 @ 80%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w6d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,4,3,80,'20X0',210,'Deadlift: 4x3 @ 80%'),
(p6w6d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,3,5,80,'21X1',90,'Hip Thrust: 3x5 @ 80%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 7, 'Semana 7 - PICO VELOCIDAD', '82.5% fuerza. Sprint 40m + flying 10m. Pico rendimiento.') RETURNING id INTO p6w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w7,1,'Día A - PICO') RETURNING id INTO p6w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w7,2,'Día B - PICO') RETURNING id INTO p6w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w7,3,'Día C - PICO') RETURNING id INTO p6w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w7d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,2,82.5,'20X0',240,'PICO | Squat: 5x2 @ 82.5%'),
(p6w7d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',120,'CMJ: 4x3'),
(p6w7d1,'49967d6e-4ec5-4d1a-8c28-13e8469a61f4',3,4,3,null,'10X0',150,'Depth Jump: 4x3. Máxima reactividadd.');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w7d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,5,2,75,'10X0',210,'PICO | Push Press: 5x2 @ 75%'),
(p6w7d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,4,82.5,'31X0',180,'Bent Over Row: 4x4 @ 82.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w7d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,2,82.5,'20X0',240,'PICO | Deadlift: 5x2 @ 82.5%'),
(p6w7d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,2,5,82.5,'21X1',90,'Hip Thrust: 2x5 @ 82.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p6, 8, 'Semana 8 - DESCARGA FINAL', 'Taper. 65%. Evaluar tiempos y marcar nuevos objetivos.') RETURNING id INTO p6w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w8,1,'Día A - DESCARGA FINAL') RETURNING id INTO p6w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w8,2,'Día B - DESCARGA FINAL') RETURNING id INTO p6w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p6w8,3,'Día C - DESCARGA FINAL') RETURNING id INTO p6w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w8d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,3,65,'20X0',150,'DESCARGA | Squat: 3x3 @ 65%'),
(p6w8d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',90,'CMJ: 3x3 mantenimiento');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w8d2,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',1,3,3,60,'10X0',150,'Push Press: 3x3 @ 60%'),
(p6w8d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,4,65,'31X0',120,'Row: 3x4 @ 65%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p6w8d3,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,3,65,'20X0',150,'Deadlift: 3x3 @ 65%');

UPDATE program_products SET duration_weeks = 8 WHERE id = p6;

-- ==================== POSTERIOR CHAIN DOMINANT - WEEKS 2-8 ====================
-- S1=70% base, S2=72.5%, S3=75%, S4=DESCARGA(55%), S5=77.5%, S6=80%, S7=82.5% PICO, S8=65% taper

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 2, 'Semana 2 - Cadena Posterior', '72.5%. Deadlift + GHR ECC. Foco isquiotibiales y espalda baja.') RETURNING id INTO p7w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w2,1,'Día A - Deadlift + RDL') RETURNING id INTO p7w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w2,2,'Día B - Hip Thrust + GHR') RETURNING id INTO p7w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w2,3,'Día C - Unilateral Posterior + Squat') RETURNING id INTO p7w2d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w2d1,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(p7w2d1,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(p7w2d1,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',3,3,12,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(p7w2d1,'29ebe870-4048-45ab-aa17-4923f25bf096',4,5,4,72.5,'31X0',210,'PRINCIPAL | BB Conventional Deadlift: 5x4 @ 72.5%'),
(p7w2d1,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',5,3,8,null,'10X0',90,'PLIOMETRÍA | Ankle Jumps'),
(p7w2d1,'00f1de91-dc49-44a5-b488-430c10620a4e',6,4,8,70,'31X0',120,'SECUNDARIO | BB RDL: 4x8 @ 70%'),
(p7w2d1,'25d98192-5707-4db8-ae84-b264eed1394d',7,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop: 3x8'),
(p7w2d1,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w2d2,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p7w2d2,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,15,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(p7w2d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',3,5,8,72.5,'21X1',120,'PRINCIPAL | BB Hip Thrust: 5x8 @ 72.5%'),
(p7w2d2,'25d98192-5707-4db8-ae84-b264eed1394d',4,4,8,null,'4010',90,'PRINCIPAL | AB GHR ECC Drop: 4x8'),
(p7w2d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',5,3,15,null,null,45,'ACCESORIO | Banded X-Walk'),
(p7w2d2,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,30,null,null,60,'CORE | Plank'),
(p7w2d2,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w2d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p7w2d3,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,10,null,null,30,'ACTIVACIÓN'),
(p7w2d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,5,70,'31X0',180,'PRINCIPAL | BB Back Squat: 4x5 @ 70%'),
(p7w2d3,'116a15ae-0584-4dea-ba5d-896e706ac376',4,3,3,null,'10X0',120,'PLIOMETRÍA | CMJ: 3x3'),
(p7w2d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,8,70,'20X0',120,'SECUNDARIO | BB Reverse Lunge: 3x8 @ 70%'),
(p7w2d3,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,30,null,null,60,'CORE | Plank'),
(p7w2d3,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

-- P7 remaining weeks (simplified)
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 3, 'Semana 3 - Posterior Chain Intensidad', '75%. Deadlift fuerza máxima. GHR ECC + isquio.') RETURNING id INTO p7w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w3,1,'Día A - Deadlift + RDL') RETURNING id INTO p7w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w3,2,'Día B - Hip Thrust + GHR') RETURNING id INTO p7w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w3,3,'Día C - Unilateral Posterior + Squat') RETURNING id INTO p7w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w3d1,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,4,75,'31X0',210,'BB Conventional Deadlift: 5x4 @ 75%'),
(p7w3d1,'fe7279f3-fa0d-4036-b858-9e8a9908bedd',2,3,8,null,'10X0',90,'Ankle Jumps'),
(p7w3d1,'00f1de91-dc49-44a5-b488-430c10620a4e',3,4,6,72.5,'31X0',120,'BB RDL: 4x6 @ 72.5%'),
(p7w3d1,'25d98192-5707-4db8-ae84-b264eed1394d',4,4,8,null,'4010',90,'AB GHR ECC Drop: 4x8');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w3d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,6,75,'21X1',120,'BB Hip Thrust: 5x6 @ 75%'),
(p7w3d2,'25d98192-5707-4db8-ae84-b264eed1394d',2,4,8,null,'4010',90,'AB GHR ECC Drop: 4x8'),
(p7w3d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',3,3,15,null,null,45,'Banded X-Walk');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w3d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,5,72.5,'31X0',180,'BB Back Squat: 4x5 @ 72.5%'),
(p7w3d3,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',120,'CMJ: 3x3'),
(p7w3d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,6,72.5,'20X0',120,'BB Reverse Lunge: 3x6 @ 72.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 4, 'Semana 4 - DESCARGA', 'Descarga activa. 55%. Recuperación completa cadena posterior.') RETURNING id INTO p7w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w4,1,'Día A - DESCARGA') RETURNING id INTO p7w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w4,2,'Día B - DESCARGA') RETURNING id INTO p7w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w4,3,'Día C - DESCARGA') RETURNING id INTO p7w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w4d1,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,4,55,'31X0',150,'DESCARGA | Deadlift: 3x4 @ 55%'),
(p7w4d1,'00f1de91-dc49-44a5-b488-430c10620a4e',2,2,6,55,'31X0',90,'BB RDL: 2x6 @ 55%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w4d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,3,6,55,'21X1',90,'DESCARGA | Hip Thrust: 3x6 @ 55%'),
(p7w4d2,'25d98192-5707-4db8-ae84-b264eed1394d',2,2,5,null,'4010',90,'AB GHR ECC Drop: 2x5');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w4d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,4,55,'31X0',150,'DESCARGA | Squat: 3x4 @ 55%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 5, 'Semana 5 - Posterior Chain II', '77.5%. Deadlift fuerza. GHR full ROM.') RETURNING id INTO p7w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w5,1,'Día A - Deadlift + RDL') RETURNING id INTO p7w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w5,2,'Día B - Hip Thrust + GHR') RETURNING id INTO p7w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w5,3,'Día C - Unilateral Posterior + Squat') RETURNING id INTO p7w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w5d1,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,3,77.5,'31X0',210,'BB Conventional Deadlift: 5x3 @ 77.5%'),
(p7w5d1,'00f1de91-dc49-44a5-b488-430c10620a4e',2,4,6,75,'31X0',120,'BB RDL: 4x6 @ 75%'),
(p7w5d1,'25d98192-5707-4db8-ae84-b264eed1394d',3,4,8,null,'4010',90,'AB GHR ECC Drop: 4x8');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w5d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,6,77.5,'21X1',120,'BB Hip Thrust: 5x6 @ 77.5%'),
(p7w5d2,'25d98192-5707-4db8-ae84-b264eed1394d',2,4,8,null,'4010',90,'AB GHR ECC Drop: 4x8'),
(p7w5d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',3,3,15,null,null,45,'Banded X-Walk');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w5d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,4,77.5,'31X0',180,'BB Back Squat: 4x4 @ 77.5%'),
(p7w5d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,3,6,75,'20X0',120,'BB Reverse Lunge: 3x6 @ 75%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 6, 'Semana 6 - Posterior Chain Alta Intensidad', '80%. Máximo estrés posterior. Sumo Deadlift + GHR asistido.') RETURNING id INTO p7w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w6,1,'Día A - Deadlift + RDL') RETURNING id INTO p7w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w6,2,'Día B - Hip Thrust + GHR') RETURNING id INTO p7w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w6,3,'Día C - Unilateral Posterior + Squat') RETURNING id INTO p7w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w6d1,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,3,80,'31X0',240,'BB Conventional Deadlift: 5x3 @ 80%'),
(p7w6d1,'00f1de91-dc49-44a5-b488-430c10620a4e',2,4,5,77.5,'31X0',120,'BB RDL: 4x5 @ 77.5%'),
(p7w6d1,'25d98192-5707-4db8-ae84-b264eed1394d',3,4,8,null,'4010',90,'AB GHR ECC Drop: 4x8');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w6d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,5,80,'21X1',120,'BB Hip Thrust: 5x5 @ 80%'),
(p7w6d2,'25d98192-5707-4db8-ae84-b264eed1394d',2,4,8,null,'4010',90,'AB GHR ECC Drop'),
(p7w6d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',3,3,15,null,null,45,'Banded X-Walk');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w6d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,3,80,'31X0',210,'BB Back Squat: 4x3 @ 80%'),
(p7w6d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,3,5,77.5,'20X0',120,'BB Reverse Lunge: 3x5 @ 77.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 7, 'Semana 7 - PICO POSTERIOR', '82.5% Deadlift. GHR máximo esfuerzo. Pico del programa.') RETURNING id INTO p7w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w7,1,'Día A - PICO Deadlift') RETURNING id INTO p7w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w7,2,'Día B - PICO Hip Thrust + GHR') RETURNING id INTO p7w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w7,3,'Día C - PICO Unilateral') RETURNING id INTO p7w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w7d1,'29ebe870-4048-45ab-aa17-4923f25bf096',1,5,2,82.5,'31X0',240,'PICO | BB Conventional Deadlift: 5x2 @ 82.5%'),
(p7w7d1,'00f1de91-dc49-44a5-b488-430c10620a4e',2,3,5,80,'31X0',120,'BB RDL: 3x5 @ 80%'),
(p7w7d1,'25d98192-5707-4db8-ae84-b264eed1394d',3,3,6,null,'4010',90,'AB GHR ECC Drop');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w7d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,4,82.5,'21X1',120,'PICO | BB Hip Thrust: 5x4 @ 82.5%'),
(p7w7d2,'25d98192-5707-4db8-ae84-b264eed1394d',2,4,6,null,'4010',90,'AB GHR ECC Drop: 4x6');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w7d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,2,82.5,'31X0',240,'PICO | Squat: 5x2 @ 82.5%'),
(p7w7d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,3,4,80,'20X0',120,'Lunge: 3x4 @ 80%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p7, 8, 'Semana 8 - DESCARGA FINAL', 'Taper. 65%. Evaluación de fuerza posterior.') RETURNING id INTO p7w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w8,1,'Día A - DESCARGA') RETURNING id INTO p7w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w8,2,'Día B - DESCARGA') RETURNING id INTO p7w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p7w8,3,'Día C - DESCARGA') RETURNING id INTO p7w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w8d1,'29ebe870-4048-45ab-aa17-4923f25bf096',1,3,4,65,'31X0',150,'DESCARGA FINAL | Deadlift: 3x4 @ 65%'),
(p7w8d1,'00f1de91-dc49-44a5-b488-430c10620a4e',2,2,6,65,'31X0',90,'BB RDL: 2x6 @ 65%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w8d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,3,6,65,'21X1',90,'Hip Thrust: 3x6 @ 65%'),
(p7w8d2,'25d98192-5707-4db8-ae84-b264eed1394d',2,2,5,null,'4010',90,'AB GHR ECC Drop: 2x5');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p7w8d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,4,65,'31X0',150,'Squat: 3x4 @ 65%');

-- ==================== UNILATERAL STRENGTH - WEEKS 2-8 ====================

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 2, 'Semana 2 - Unilateral Adaptación', 'Incremento 5%. RFESS + SL RDL + SL Hip Thrust. Estabilidad.') RETURNING id INTO p8w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w2,1,'Día A - Unilateral Inferior Squat') RETURNING id INTO p8w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w2,2,'Día B - Unilateral Inferior Hinge') RETURNING id INTO p8w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w2,3,'Día C - Unilateral Superior + Core') RETURNING id INTO p8w2d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(p8w2d1,'6ff055c9-f022-4186-a9c7-c49a9b53e088',2,2,8,null,null,30,'MOVILIDAD | Spiderman'),
(p8w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',3,2,10,null,null,30,'ACTIVACIÓN | Birddog'),
(p8w2d1,'d0ae6c95-91ca-49d1-aad4-bb0f5b56fb82',4,2,15,null,null,30,'ACTIVACIÓN | Hip Abduction'),
(p8w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,4,6,65,'31X0',150,'PRINCIPAL | BB Reverse Lunge/RFESS: 4x6/lado @ 65%'),
(p8w2d1,'116a15ae-0584-4dea-ba5d-896e706ac376',6,3,3,null,'10X0',90,'PLIOMETRÍA | CMJ: 3x3'),
(p8w2d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',7,3,12,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(p8w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',8,3,30,null,null,60,'CORE | Plank'),
(p8w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',9,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w2d2,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(p8w2d2,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(p8w2d2,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',3,3,12,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(p8w2d2,'00f1de91-dc49-44a5-b488-430c10620a4e',4,4,6,65,'31X0',150,'PRINCIPAL | BB SL RDL: 4x6/lado @ 65%'),
(p8w2d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',5,4,8,65,'21X1',120,'SECUNDARIO | BB SL Hip Thrust: 4x8/lado @ 65%'),
(p8w2d2,'25d98192-5707-4db8-ae84-b264eed1394d',6,3,6,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p8w2d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',7,2,15,null,null,45,'Banded X-Walk'),
(p8w2d2,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w2d3,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(p8w2d3,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(p8w2d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,3,8,65,'31X0',120,'SUPERIOR | BB Bench Press: 3x8 @ 65%'),
(p8w2d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',4,3,8,65,'31X0',120,'SUPERIOR | BB Bent Over Row: 3x8 @ 65%'),
(p8w2d3,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',5,3,40,null,null,60,'CORE | Plank: 3x40s'),
(p8w2d3,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',6,2,15,null,null,60,'Cable Face Pull'),
(p8w2d3,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

-- P8 Weeks 3-8
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 3, 'Semana 3 - Unilateral Desarrollo', '70%. Mayor rango de movimiento. Balance + fuerza.') RETURNING id INTO p8w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w3,1,'Día A - Unilateral Inferior Squat') RETURNING id INTO p8w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w3,2,'Día B - Unilateral Inferior Hinge') RETURNING id INTO p8w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w3,3,'Día C - Unilateral Superior + Core') RETURNING id INTO p8w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,4,5,70,'31X0',150,'BB Reverse Lunge/RFESS: 4x5/lado @ 70%'),
(p8w3d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',90,'CMJ: 3x3'),
(p8w3d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',3,3,10,null,'4010',60,'Banded Sissy Squat ECC'),
(p8w3d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,35,null,null,60,'Plank');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w3d2,'00f1de91-dc49-44a5-b488-430c10620a4e',1,4,6,70,'31X0',150,'BB SL RDL: 4x6/lado @ 70%'),
(p8w3d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,6,70,'21X1',120,'BB SL Hip Thrust: 4x6/lado @ 70%'),
(p8w3d2,'25d98192-5707-4db8-ae84-b264eed1394d',3,3,6,null,'4010',90,'AB GHR ECC Drop');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w3d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,3,6,70,'31X0',120,'BB Bench Press: 3x6 @ 70%'),
(p8w3d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,6,70,'31X0',120,'BB Bent Over Row: 3x6 @ 70%'),
(p8w3d3,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',3,3,40,null,null,60,'Plank');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 4, 'Semana 4 - DESCARGA', 'Descarga activa. 55%. Estabilidad y control motor.') RETURNING id INTO p8w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w4,1,'Día A - DESCARGA') RETURNING id INTO p8w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w4,2,'Día B - DESCARGA') RETURNING id INTO p8w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w4,3,'Día C - DESCARGA') RETURNING id INTO p8w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w4d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,3,4,55,'31X0',120,'DESCARGA | Lunge: 3x4/lado @ 55%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w4d2,'00f1de91-dc49-44a5-b488-430c10620a4e',1,3,5,55,'31X0',90,'DESCARGA | SL RDL: 3x5/lado @ 55%'),
(p8w4d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,3,6,55,'21X1',90,'Hip Thrust: 3x6 @ 55%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w4d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,2,6,55,'31X0',90,'DESCARGA | Bench Press: 2x6 @ 55%'),
(p8w4d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,2,6,55,'31X0',90,'Row: 2x6 @ 55%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 5, 'Semana 5 - Unilateral Intensificación', '72.5%. Mayor carga unilateral. Asimetría controlada.') RETURNING id INTO p8w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w5,1,'Día A - Unilateral Inferior Squat') RETURNING id INTO p8w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w5,2,'Día B - Unilateral Inferior Hinge') RETURNING id INTO p8w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w5,3,'Día C - Unilateral Superior + Core') RETURNING id INTO p8w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,5,5,72.5,'31X0',150,'BB RFESS/Lunge: 5x5/lado @ 72.5%. +1 serie.'),
(p8w5d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',90,'CMJ: 4x3'),
(p8w5d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',3,3,10,null,'4010',60,'Banded Sissy Squat ECC');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w5d2,'00f1de91-dc49-44a5-b488-430c10620a4e',1,4,5,72.5,'31X0',150,'BB SL RDL: 4x5/lado @ 72.5%'),
(p8w5d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,6,72.5,'21X1',120,'BB SL Hip Thrust: 4x6/lado @ 72.5%'),
(p8w5d2,'25d98192-5707-4db8-ae84-b264eed1394d',3,3,8,null,'4010',90,'AB GHR ECC Drop');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w5d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,6,72.5,'31X0',120,'BB Bench Press: 4x6 @ 72.5%'),
(p8w5d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,6,72.5,'31X0',120,'BB Bent Over Row: 4x6 @ 72.5%'),
(p8w5d3,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',3,3,45,null,null,60,'Plank');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 6, 'Semana 6 - Unilateral Alta Intensidad', '75%. Déficit Lunge. SL Deadlift máxima ROM.') RETURNING id INTO p8w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w6,1,'Día A - Unilateral Inferior Squat') RETURNING id INTO p8w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w6,2,'Día B - Unilateral Inferior Hinge') RETURNING id INTO p8w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w6,3,'Día C - Unilateral Superior + Core') RETURNING id INTO p8w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w6d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,4,4,75,'31X0',150,'BB RFESS: 4x4/lado @ 75%. Paso largo máximo.'),
(p8w6d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,4,3,null,'10X0',90,'CMJ: 4x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w6d2,'00f1de91-dc49-44a5-b488-430c10620a4e',1,4,5,75,'31X0',150,'BB SL RDL: 4x5/lado @ 75%'),
(p8w6d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,5,75,'21X1',120,'BB SL Hip Thrust: 4x5/lado @ 75%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w6d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,5,75,'31X0',120,'BB Bench Press: 4x5 @ 75%'),
(p8w6d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,5,75,'31X0',120,'BB Bent Over Row: 4x5 @ 75%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 7, 'Semana 7 - PICO UNILATERAL', '77.5% máxima carga unilateral. Evaluación asimetría.') RETURNING id INTO p8w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w7,1,'Día A - PICO Squat') RETURNING id INTO p8w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w7,2,'Día B - PICO Hinge') RETURNING id INTO p8w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w7,3,'Día C - PICO Superior') RETURNING id INTO p8w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w7d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,5,4,77.5,'31X0',180,'PICO | BB RFESS: 5x4/lado @ 77.5%'),
(p8w7d1,'116a15ae-0584-4dea-ba5d-896e706ac376',2,3,3,null,'10X0',90,'CMJ: 3x3');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w7d2,'00f1de91-dc49-44a5-b488-430c10620a4e',1,5,4,77.5,'31X0',180,'PICO | BB SL RDL: 5x4/lado @ 77.5%'),
(p8w7d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,5,77.5,'21X1',120,'BB SL Hip Thrust: 4x5/lado @ 77.5%'),
(p8w7d2,'25d98192-5707-4db8-ae84-b264eed1394d',3,3,6,null,'4010',90,'AB GHR ECC Drop');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w7d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,4,77.5,'31X0',120,'PICO | Bench Press: 4x4 @ 77.5%'),
(p8w7d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,4,77.5,'31X0',120,'PICO | Bent Over Row: 4x4 @ 77.5%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p8, 8, 'Semana 8 - DESCARGA FINAL', 'Taper. 60%. Evaluar diferencia L/D y consolidar ganancias.') RETURNING id INTO p8w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w8,1,'Día A - DESCARGA') RETURNING id INTO p8w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w8,2,'Día B - DESCARGA') RETURNING id INTO p8w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p8w8,3,'Día C - DESCARGA') RETURNING id INTO p8w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w8d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',1,3,4,60,'31X0',120,'DESCARGA FINAL | Lunge: 3x4/lado @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w8d2,'00f1de91-dc49-44a5-b488-430c10620a4e',1,3,4,60,'31X0',120,'SL RDL: 3x4 @ 60%'),
(p8w8d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,3,6,60,'21X1',90,'Hip Thrust: 3x6 @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p8w8d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,3,5,60,'31X0',90,'Bench Press: 3x5 @ 60%'),
(p8w8d3,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,3,5,60,'31X0',90,'Row: 3x5 @ 60%');

UPDATE program_products SET duration_weeks = 8 WHERE id IN (p7, p8);

END $$;
