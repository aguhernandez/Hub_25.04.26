/*
  # Lower Body Hypertrophy + Upper Body Push-Pull - Semanas 2-8
  
  Programa 4: Lower Body Hypertrophy (031a8323) - Descarga semana 4
  Programa 5: Upper Body Push-Pull (074969b6) - Descarga semana 4
  
  Lower Body Hypertrophy Periodización (hipertrofia):
  - S1: 65% base 4x10
  - S2: 67.5% 4x10
  - S3: 70% 4x8
  - S4: DESCARGA 55% 3x8
  - S5: 72.5% 4x8
  - S6: 75% 4x6-8
  - S7: 77.5% PICO 4x6
  - S8: DESCARGA FINAL 60%
*/

DO $$
DECLARE
  p4 uuid := '031a8323-af91-4566-894d-8cc3326c21d4';
  p5 uuid := '074969b6-79e9-49ec-8bbc-be3775604a50';
  
  p4w2 uuid; p4w3 uuid; p4w4 uuid; p4w5 uuid; p4w6 uuid; p4w7 uuid; p4w8 uuid;
  p4w2d1 uuid; p4w2d2 uuid; p4w2d3 uuid;
  p4w3d1 uuid; p4w3d2 uuid; p4w3d3 uuid;
  p4w4d1 uuid; p4w4d2 uuid; p4w4d3 uuid;
  p4w5d1 uuid; p4w5d2 uuid; p4w5d3 uuid;
  p4w6d1 uuid; p4w6d2 uuid; p4w6d3 uuid;
  p4w7d1 uuid; p4w7d2 uuid; p4w7d3 uuid;
  p4w8d1 uuid; p4w8d2 uuid; p4w8d3 uuid;
  
  p5w2 uuid; p5w3 uuid; p5w4 uuid; p5w5 uuid; p5w6 uuid; p5w7 uuid; p5w8 uuid;
  p5w2d1 uuid; p5w2d2 uuid; p5w2d3 uuid; p5w2d4 uuid;
  p5w3d1 uuid; p5w3d2 uuid; p5w3d3 uuid; p5w3d4 uuid;
  p5w4d1 uuid; p5w4d2 uuid; p5w4d3 uuid; p5w4d4 uuid;
  p5w5d1 uuid; p5w5d2 uuid; p5w5d3 uuid; p5w5d4 uuid;
  p5w6d1 uuid; p5w6d2 uuid; p5w6d3 uuid; p5w6d4 uuid;
  p5w7d1 uuid; p5w7d2 uuid; p5w7d3 uuid; p5w7d4 uuid;
  p5w8d1 uuid; p5w8d2 uuid; p5w8d3 uuid; p5w8d4 uuid;
BEGIN

-- ==================== LOWER BODY HYPERTROPHY ====================

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 2, 'Semana 2 - Hipertrofia Acumulación', '67.5% 1RM. Alto volumen 4x10. Metabolic stress.') RETURNING id INTO p4w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w2, 1, 'Día A - Quad Dominante') RETURNING id INTO p4w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w2, 2, 'Día B - Glúteo + Isquio') RETURNING id INTO p4w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w2, 3, 'Día C - Quad + Glúteo Completo') RETURNING id INTO p4w2d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w2d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD | 90-90'),
(p4w2d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,15,null,null,30,'ACTIVACIÓN | Birddog'),
(p4w2d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,10,67.5,'30X0',120,'PRINCIPAL | BB Back Squat: 4x10 @ 67.5%. Rango completo hipertrofia.'),
(p4w2d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',4,3,10,67.5,'20X0',90,'SECUNDARIO | BB Reverse Lunge: 3x10/lado @ 67.5%'),
(p4w2d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',5,3,15,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC: 3x15'),
(p4w2d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,30,null,null,60,'ACCESORIO | Plank'),
(p4w2d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w2d2,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD | Hip Flexor'),
(p4w2d2,'912eaf9a-817f-42e3-b36b-78ff9a358cdd',2,2,8,null,null,30,'MOVILIDAD | Hip Airplane'),
(p4w2d2,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',3,3,15,null,'20X0',45,'ACTIVACIÓN | BB Glute Bridge'),
(p4w2d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',4,4,12,67.5,'21X1',90,'PRINCIPAL | BB Hip Thrust: 4x12 @ 67.5%'),
(p4w2d2,'00f1de91-dc49-44a5-b488-430c10620a4e',5,4,10,65,'31X0',90,'PRINCIPAL | BB RDL: 4x10 @ 65%'),
(p4w2d2,'25d98192-5707-4db8-ae84-b264eed1394d',6,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p4w2d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',7,2,15,null,null,45,'ACCESORIO | Banded X-Walk'),
(p4w2d2,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w2d3,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p4w2d3,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,15,null,null,30,'ACTIVACIÓN'),
(p4w2d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,10,67.5,'30X0',120,'PRINCIPAL | BB Back Squat: 4x10 @ 67.5%'),
(p4w2d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',4,4,10,67.5,'21X1',90,'PRINCIPAL | BB Hip Thrust: 4x10 @ 67.5%'),
(p4w2d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',5,3,10,67.5,'20X0',90,'SECUNDARIO | BB Reverse Lunge'),
(p4w2d3,'13d9ba3f-05f1-42ef-a415-221649fb784b',6,3,12,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(p4w2d3,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,1,1,null,null,0,'VUELTA A LA CALMA');

-- Week 3
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 3, 'Semana 3 - Hipertrofia Intensificación', '70% 1RM. Reducir reps a 4x8. Aumentar tensión mecánica.') RETURNING id INTO p4w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w3, 1, 'Día A - Quad Dominante') RETURNING id INTO p4w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w3, 2, 'Día B - Glúteo + Isquio') RETURNING id INTO p4w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w3, 3, 'Día C - Quad + Glúteo Completo') RETURNING id INTO p4w3d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w3d1,'34f92f77-93d0-42d2-8e7d-e90db24b5a07',1,2,10,null,null,30,'MOVILIDAD'),
(p4w3d1,'e705cbd3-046e-41dc-9c08-b95f164d65c9',2,2,15,null,null,30,'ACTIVACIÓN'),
(p4w3d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',3,4,8,70,'31X0',120,'PRINCIPAL | BB Back Squat: 4x8 @ 70%'),
(p4w3d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',4,3,8,70,'20X0',90,'SECUNDARIO | BB Reverse Lunge: 3x8/lado @ 70%'),
(p4w3d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',5,3,12,null,'4010',60,'ACCESORIO | Banded Sissy Squat ECC'),
(p4w3d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',6,3,35,null,null,60,'ACCESORIO | Plank'),
(p4w3d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w3d2,'7842d641-78a4-4a78-b2e6-af9468a0bb6a',1,2,8,null,null,30,'MOVILIDAD'),
(p4w3d2,'0279e7fd-8bbd-479c-ac40-d259ca583d6e',2,3,12,null,'20X0',45,'ACTIVACIÓN'),
(p4w3d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',3,4,10,70,'21X1',90,'PRINCIPAL | BB Hip Thrust: 4x10 @ 70%'),
(p4w3d2,'00f1de91-dc49-44a5-b488-430c10620a4e',4,4,8,67.5,'31X0',90,'PRINCIPAL | BB RDL: 4x8 @ 67.5%'),
(p4w3d2,'25d98192-5707-4db8-ae84-b264eed1394d',5,3,8,null,'4010',90,'ACCESORIO | AB GHR ECC Drop'),
(p4w3d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',6,2,15,null,null,45,'ACCESORIO | Banded X-Walk'),
(p4w3d2,'fd6cfed7-9b4c-479b-bc41-b9477e2fb748',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w3d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,8,70,'31X0',120,'PRINCIPAL | BB Back Squat: 4x8 @ 70%'),
(p4w3d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,8,70,'21X1',90,'PRINCIPAL | BB Hip Thrust: 4x8 @ 70%'),
(p4w3d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,8,70,'20X0',90,'BB Reverse Lunge'),
(p4w3d3,'13d9ba3f-05f1-42ef-a415-221649fb784b',4,3,12,null,'4010',60,'Banded Sissy Squat ECC');

-- Week 4 DESCARGA
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 4, 'Semana 4 - DESCARGA', 'Semana de descarga. 55% 1RM, 3x8. Recuperación muscular.') RETURNING id INTO p4w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w4, 1, 'Día A - DESCARGA Quad') RETURNING id INTO p4w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w4, 2, 'Día B - DESCARGA Posterior') RETURNING id INTO p4w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w4, 3, 'Día C - DESCARGA Completo') RETURNING id INTO p4w4d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w4d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,8,55,'30X0',90,'DESCARGA | Squat: 3x8 @ 55%'),
(p4w4d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,2,8,55,'20X0',60,'DESCARGA | Lunge: 2x8 @ 55%'),
(p4w4d1,'28b038f4-adbe-4c6e-bf57-2f5014bdfa59',3,1,1,null,null,0,'VUELTA A LA CALMA');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w4d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,3,8,55,'21X1',60,'DESCARGA | Hip Thrust: 3x8 @ 55%'),
(p4w4d2,'00f1de91-dc49-44a5-b488-430c10620a4e',2,3,8,55,'31X0',60,'DESCARGA | BB RDL: 3x8 @ 55%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w4d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,2,8,55,'30X0',90,'DESCARGA | Squat: 2x8 @ 55%'),
(p4w4d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,2,8,55,'21X1',60,'Hip Thrust: 2x8 @ 55%');

-- Week 5
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 5, 'Semana 5 - Segundo Bloque Hipertrofia', '72.5% 1RM. Incremento progresivo carga-volumen.') RETURNING id INTO p4w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w5, 1, 'Día A - Quad Dominante') RETURNING id INTO p4w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w5, 2, 'Día B - Glúteo + Isquio') RETURNING id INTO p4w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w5, 3, 'Día C - Quad + Glúteo Completo') RETURNING id INTO p4w5d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w5d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,8,72.5,'31X0',120,'PRINCIPAL | BB Back Squat: 5x8 @ 72.5%. +1 serie respecto bloque 1.'),
(p4w5d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,3,10,72.5,'20X0',90,'SECUNDARIO | BB Reverse Lunge: 3x10/lado'),
(p4w5d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',3,3,12,null,'4010',60,'Banded Sissy Squat ECC'),
(p4w5d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,40,null,null,60,'Plank 3x40s');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w5d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,10,72.5,'21X1',90,'PRINCIPAL | BB Hip Thrust: 5x10 @ 72.5%'),
(p4w5d2,'00f1de91-dc49-44a5-b488-430c10620a4e',2,4,8,70,'31X0',90,'BB RDL: 4x8 @ 70%'),
(p4w5d2,'25d98192-5707-4db8-ae84-b264eed1394d',3,3,8,null,'4010',90,'AB GHR ECC Drop'),
(p4w5d2,'4988efed-6a7d-4504-a01a-e0f9c787c4f7',4,2,15,null,null,45,'Banded X-Walk');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w5d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,8,72.5,'31X0',120,'BB Back Squat: 4x8 @ 72.5%'),
(p4w5d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,8,72.5,'21X1',90,'BB Hip Thrust: 4x8 @ 72.5%'),
(p4w5d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,8,72.5,'20X0',90,'BB Reverse Lunge');

-- Week 6
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 6, 'Semana 6 - Intensificación Hipertrofia', '75% 1RM. 4x6-8. Mayor tensión mecánica. Pump máximo.') RETURNING id INTO p4w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w6, 1, 'Día A - Quad Dominante') RETURNING id INTO p4w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w6, 2, 'Día B - Glúteo + Isquio') RETURNING id INTO p4w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w6, 3, 'Día C - Quad + Glúteo Completo') RETURNING id INTO p4w6d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w6d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,8,75,'31X0',120,'PRINCIPAL | BB Back Squat: 4x8 @ 75%'),
(p4w6d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,4,8,75,'20X0',90,'BB Reverse Lunge: 4x8 @ 75%'),
(p4w6d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',3,4,12,null,'4010',60,'Banded Sissy Squat ECC: 4x12'),
(p4w6d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,45,null,null,60,'Plank');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w6d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,8,75,'21X1',90,'PRINCIPAL | BB Hip Thrust: 5x8 @ 75%'),
(p4w6d2,'00f1de91-dc49-44a5-b488-430c10620a4e',2,4,8,72.5,'31X0',90,'BB RDL: 4x8 @ 72.5%'),
(p4w6d2,'25d98192-5707-4db8-ae84-b264eed1394d',3,3,8,null,'4010',90,'AB GHR ECC Drop');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w6d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,4,6,75,'31X0',120,'Squat: 4x6 @ 75% - tensión mecánica'),
(p4w6d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,4,6,75,'21X1',90,'Hip Thrust: 4x6 @ 75%'),
(p4w6d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,6,75,'20X0',90,'BB Reverse Lunge');

-- Week 7 PICO
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 7, 'Semana 7 - PICO HIPERTROFIA', '77.5% 1RM. Máximo volumen del programa. Tensión mecánica + estrés metabólico.') RETURNING id INTO p4w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w7, 1, 'Día A - Quad Dominante') RETURNING id INTO p4w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w7, 2, 'Día B - Glúteo + Isquio') RETURNING id INTO p4w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w7, 3, 'Día C - Quad + Glúteo Completo') RETURNING id INTO p4w7d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w7d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,6,77.5,'31X0',120,'PICO | BB Back Squat: 5x6 @ 77.5%. Máximo volumen del programa.'),
(p4w7d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,4,8,77.5,'20X0',90,'BB Reverse Lunge: 4x8 @ 77.5%'),
(p4w7d1,'13d9ba3f-05f1-42ef-a415-221649fb784b',3,4,12,null,'4010',60,'Banded Sissy Squat ECC: 4x12'),
(p4w7d1,'bc9be065-ed34-4dc7-a1d1-ec7fb7cd7cea',4,3,45,null,null,60,'Plank');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w7d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,5,8,77.5,'21X1',90,'PICO | BB Hip Thrust: 5x8 @ 77.5%'),
(p4w7d2,'00f1de91-dc49-44a5-b488-430c10620a4e',2,4,6,75,'31X0',90,'BB RDL: 4x6 @ 75%'),
(p4w7d2,'25d98192-5707-4db8-ae84-b264eed1394d',3,4,8,null,'4010',90,'AB GHR ECC Drop: 4x8');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w7d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,5,6,77.5,'31X0',120,'Squat: 5x6 @ 77.5%'),
(p4w7d3,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',2,5,6,77.5,'21X1',90,'Hip Thrust: 5x6 @ 77.5%'),
(p4w7d3,'4d8f4f46-8956-472a-907e-7f027c1cadd3',3,3,8,77.5,'20X0',90,'BB Reverse Lunge');

-- Week 8 DESCARGA FINAL
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p4, 8, 'Semana 8 - DESCARGA FINAL', '60% 1RM, 3x8. Recuperación. Medir circunferencia muscular.') RETURNING id INTO p4w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w8, 1, 'Día A - DESCARGA Quad') RETURNING id INTO p4w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w8, 2, 'Día B - DESCARGA Posterior') RETURNING id INTO p4w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p4w8, 3, 'Día C - DESCARGA Completo') RETURNING id INTO p4w8d3;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w8d1,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,8,60,'30X0',90,'DESCARGA FINAL | Squat: 3x8 @ 60%'),
(p4w8d1,'4d8f4f46-8956-472a-907e-7f027c1cadd3',2,2,8,60,'20X0',60,'Lunge: 2x8 @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w8d2,'59f9aa61-d283-4e5e-bfdc-b4083c0b597e',1,3,8,60,'21X1',60,'DESCARGA | Hip Thrust: 3x8 @ 60%'),
(p4w8d2,'00f1de91-dc49-44a5-b488-430c10620a4e',2,3,8,60,'31X0',60,'BB RDL: 3x8 @ 60%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p4w8d3,'1416bca1-de27-49f6-bdb3-f07f8626916c',1,3,8,60,'30X0',90,'DESCARGA FINAL | Evaluación calidad movimiento.');

-- ==================== UPPER BODY PUSH-PULL ====================

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 2, 'Semana 2 - Push-Pull Acumulación', '65% 1RM. Volumen alto 4x10. Metabolic stress.') RETURNING id INTO p5w2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w2, 1, 'Push A - Horizontal + Vertical') RETURNING id INTO p5w2d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w2, 2, 'Pull A - Horizontal + Vertical') RETURNING id INTO p5w2d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w2, 3, 'Push B - Incline + Push Press') RETURNING id INTO p5w2d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w2, 4, 'Pull B - High Pull + OH Pull') RETURNING id INTO p5w2d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w2d1,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD | Side Lying Windmill'),
(p5w2d1,'796d9467-b7e0-4033-b9da-3949e0f58ae9',2,3,15,null,null,30,'ACTIVACIÓN | Band Pullapart'),
(p5w2d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',3,4,10,65,'30X0',120,'PRINCIPAL | BB Bench Press: 4x10 @ 65%'),
(p5w2d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',4,4,10,65,'21X0',120,'PRINCIPAL | BB Military Press: 4x10 @ 65%'),
(p5w2d1,'67920661-ac0e-42f7-80f8-51e3c81dec36',5,3,12,65,'21X0',90,'SECUNDARIO | BB Incline Press: 3x12 @ 65%'),
(p5w2d1,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',6,3,12,null,'20X0',60,'ACCESORIO | BW Dips: 3x12'),
(p5w2d1,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',7,3,15,null,null,60,'ACCESORIO | Cable Face Pull'),
(p5w2d1,'192d3181-13ef-45da-84d6-a41c579e6994',8,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w2d2,'02fbbcfa-dc66-4185-8895-dc9547e8cbe1',1,2,10,null,null,30,'MOVILIDAD | Shoulder Openers'),
(p5w2d2,'63e02cc4-3b48-4ed2-8b01-a2041c18a874',2,2,12,null,null,30,'ACTIVACIÓN | Shoulder ER'),
(p5w2d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',3,4,10,65,'31X0',120,'PRINCIPAL | BB Bent Over Row: 4x10 @ 65%'),
(p5w2d2,'94e11eb6-9fee-4116-a873-0001d041027b',4,4,12,null,'21X0',90,'PRINCIPAL | Cable Low Row: 4x12'),
(p5w2d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,3,15,null,null,60,'SECUNDARIO | Cable Face Pull'),
(p5w2d2,'796d9467-b7e0-4033-b9da-3949e0f58ae9',6,3,15,null,null,60,'ACCESORIO | Band Pullapart'),
(p5w2d2,'192d3181-13ef-45da-84d6-a41c579e6994',7,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w2d3,'c2374292-62aa-4898-8f63-a74da2c19a43',1,2,8,null,null,30,'MOVILIDAD'),
(p5w2d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',2,4,8,67.5,'30X0',120,'PRINCIPAL | BB Bench Press: 4x8 @ 67.5%'),
(p5w2d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',3,4,6,65,'10X0',120,'PRINCIPAL | BB Push Press: 4x6 @ 65%'),
(p5w2d3,'67920661-ac0e-42f7-80f8-51e3c81dec36',4,3,10,67.5,'21X0',90,'SECUNDARIO | BB Incline Press'),
(p5w2d3,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',5,3,10,null,'20X0',60,'ACCESORIO | BW Dips'),
(p5w2d3,'192d3181-13ef-45da-84d6-a41c579e6994',6,1,1,null,null,0,'VUELTA A LA CALMA');

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w2d4,'02fbbcfa-dc66-4185-8895-dc9547e8cbe1',1,2,10,null,null,30,'MOVILIDAD'),
(p5w2d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',2,4,8,67.5,'31X0',120,'PRINCIPAL | BB Bent Over Row: 4x8 @ 67.5%'),
(p5w2d4,'94e11eb6-9fee-4116-a873-0001d041027b',3,4,12,null,'21X0',90,'Cable Low Row: 4x12'),
(p5w2d4,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',4,3,15,null,null,60,'Cable Face Pull'),
(p5w2d4,'192d3181-13ef-45da-84d6-a41c579e6994',5,1,1,null,null,0,'VUELTA A LA CALMA');

-- Weeks 3-8 (seguir patrón similar con progresión)
INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 3, 'Semana 3 - Push-Pull Intensificación', '70% 1RM. 4x8. Tensión mecánica mayor.') RETURNING id INTO p5w3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w3, 1, 'Push A') RETURNING id INTO p5w3d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w3, 2, 'Pull A') RETURNING id INTO p5w3d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w3, 3, 'Push B') RETURNING id INTO p5w3d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w3, 4, 'Pull B') RETURNING id INTO p5w3d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w3d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,8,70,'31X0',120,'BB Bench Press: 4x8 @ 70%'),
(p5w3d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',2,4,8,70,'21X0',120,'BB Military Press: 4x8 @ 70%'),
(p5w3d1,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,10,70,'21X0',90,'BB Incline Press: 3x10 @ 70%'),
(p5w3d1,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',4,3,10,null,'20X0',60,'BW Dips'),
(p5w3d1,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,3,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w3d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,4,8,70,'31X0',120,'BB Bent Over Row: 4x8 @ 70%'),
(p5w3d2,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,12,null,'21X0',90,'Cable Low Row'),
(p5w3d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',3,3,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w3d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,6,70,'31X0',120,'BB Bench Press: 4x6 @ 70%'),
(p5w3d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,4,5,67.5,'10X0',120,'BB Push Press: 4x5 @ 67.5%'),
(p5w3d3,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,8,70,'21X0',90,'BB Incline Press');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w3d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,4,6,70,'31X0',120,'BB Bent Over Row: 4x6 @ 70%'),
(p5w3d4,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,10,null,'21X0',90,'Cable Low Row');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 4, 'Semana 4 - DESCARGA', 'Descarga activa. 55% 1RM. Recuperación muscular completa.') RETURNING id INTO p5w4;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w4, 1, 'DESCARGA Push A') RETURNING id INTO p5w4d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w4, 2, 'DESCARGA Pull A') RETURNING id INTO p5w4d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w4, 3, 'DESCARGA Push B') RETURNING id INTO p5w4d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w4, 4, 'DESCARGA Pull B') RETURNING id INTO p5w4d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w4d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,3,6,55,'31X0',90,'DESCARGA | Bench Press: 3x6 @ 55%'),
(p5w4d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',2,3,6,55,'21X0',90,'Military Press: 3x6 @ 55%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w4d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,3,6,55,'31X0',90,'DESCARGA | Bent Over Row: 3x6 @ 55%'),
(p5w4d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',2,2,12,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w4d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,3,5,55,'31X0',90,'DESCARGA | Bench Press: 3x5 @ 55%'),
(p5w4d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,3,4,50,'10X0',90,'Push Press: 3x4 @ 50%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w4d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,3,5,55,'31X0',90,'DESCARGA | Row: 3x5 @ 55%');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 5, 'Semana 5 - Segundo Bloque Push-Pull', '72.5% 1RM. Mayor volumen. Supersets Push-Pull.') RETURNING id INTO p5w5;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w5, 1, 'Push A') RETURNING id INTO p5w5d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w5, 2, 'Pull A') RETURNING id INTO p5w5d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w5, 3, 'Push B') RETURNING id INTO p5w5d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w5, 4, 'Pull B') RETURNING id INTO p5w5d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w5d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,5,8,72.5,'31X0',120,'BB Bench Press: 5x8 @ 72.5%. +1 serie.'),
(p5w5d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',2,4,8,72.5,'21X0',120,'BB Military Press: 4x8 @ 72.5%'),
(p5w5d1,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,10,70,'21X0',90,'BB Incline Press'),
(p5w5d1,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',4,3,10,null,'20X0',60,'BW Dips'),
(p5w5d1,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,3,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w5d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,5,8,72.5,'31X0',120,'BB Bent Over Row: 5x8 @ 72.5%'),
(p5w5d2,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,10,null,'21X0',90,'Cable Low Row'),
(p5w5d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',3,3,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w5d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,6,72.5,'31X0',120,'BB Bench Press: 4x6 @ 72.5%'),
(p5w5d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,4,5,70,'10X0',120,'BB Push Press: 4x5 @ 70%'),
(p5w5d3,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,8,72.5,'21X0',90,'BB Incline Press');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w5d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,4,6,72.5,'31X0',120,'BB Bent Over Row: 4x6 @ 72.5%'),
(p5w5d4,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,10,null,'21X0',90,'Cable Low Row');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 6, 'Semana 6 - Intensificación Push-Pull', '75% 1RM. 4x6-8. Carga progresiva.') RETURNING id INTO p5w6;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w6, 1, 'Push A') RETURNING id INTO p5w6d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w6, 2, 'Pull A') RETURNING id INTO p5w6d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w6, 3, 'Push B') RETURNING id INTO p5w6d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w6, 4, 'Pull B') RETURNING id INTO p5w6d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w6d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,6,75,'31X0',120,'BB Bench Press: 4x6 @ 75%'),
(p5w6d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',2,4,6,75,'21X0',120,'BB Military Press: 4x6 @ 75%'),
(p5w6d1,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,8,72.5,'21X0',90,'BB Incline Press');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w6d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,4,6,75,'31X0',120,'BB Bent Over Row: 4x6 @ 75%'),
(p5w6d2,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,10,null,'21X0',90,'Cable Low Row');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w6d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,5,75,'31X0',120,'BB Bench Press: 4x5 @ 75%'),
(p5w6d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,4,4,72.5,'10X0',120,'BB Push Press: 4x4 @ 72.5%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w6d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,4,5,75,'31X0',120,'BB Bent Over Row: 4x5 @ 75%'),
(p5w6d4,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,8,null,'21X0',90,'Cable Low Row');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 7, 'Semana 7 - PICO TREN SUPERIOR', '77.5-80% 1RM. Máxima carga. Volumen reducido. Fuerza + hipertrofia.') RETURNING id INTO p5w7;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w7, 1, 'Push A - PICO') RETURNING id INTO p5w7d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w7, 2, 'Pull A - PICO') RETURNING id INTO p5w7d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w7, 3, 'Push B - PICO') RETURNING id INTO p5w7d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w7, 4, 'Pull B - PICO') RETURNING id INTO p5w7d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w7d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,5,4,77.5,'31X0',180,'PICO | BB Bench Press: 5x4 @ 77.5%'),
(p5w7d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',2,5,4,77.5,'21X0',180,'PICO | BB Military Press: 5x4 @ 77.5%'),
(p5w7d1,'67920661-ac0e-42f7-80f8-51e3c81dec36',3,3,6,75,'21X0',90,'BB Incline Press: 3x6 @ 75%'),
(p5w7d1,'3821470f-c663-40dd-85b3-6f0d6a0a5df3',4,3,8,null,'20X0',60,'BW Dips'),
(p5w7d1,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',5,2,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w7d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,5,4,77.5,'31X0',180,'PICO | BB Bent Over Row: 5x4 @ 77.5%'),
(p5w7d2,'94e11eb6-9fee-4116-a873-0001d041027b',2,4,8,null,'21X0',90,'Cable Low Row'),
(p5w7d2,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',3,3,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w7d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,4,4,80,'31X0',180,'PICO | Bench Press: 4x4 @ 80%'),
(p5w7d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,4,3,75,'10X0',180,'Push Press: 4x3 @ 75%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w7d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,4,4,80,'31X0',180,'PICO | Bent Over Row: 4x4 @ 80%'),
(p5w7d4,'94e11eb6-9fee-4116-a873-0001d041027b',2,3,8,null,'21X0',90,'Cable Low Row');

INSERT INTO program_weeks (program_product_id, week_number, title, description) VALUES (p5, 8, 'Semana 8 - DESCARGA FINAL', '60% 1RM. 3x6. Recuperación y consolidación neural.') RETURNING id INTO p5w8;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w8, 1, 'DESCARGA Push A') RETURNING id INTO p5w8d1;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w8, 2, 'DESCARGA Pull A') RETURNING id INTO p5w8d2;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w8, 3, 'DESCARGA Push B') RETURNING id INTO p5w8d3;
INSERT INTO program_days (program_week_id, day_number, day_name) VALUES (p5w8, 4, 'DESCARGA Pull B') RETURNING id INTO p5w8d4;

INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w8d1,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,3,6,60,'31X0',90,'DESCARGA FINAL | Bench Press: 3x6 @ 60%'),
(p5w8d1,'4fcee15d-0b8f-4d48-b025-224f6393cda8',2,3,6,60,'21X0',90,'Military Press: 3x6 @ 60%'),
(p5w8d1,'e3e44f5c-daf0-45c3-808a-4f61a14bd710',3,2,15,null,null,60,'Cable Face Pull');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w8d2,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,3,6,60,'31X0',90,'DESCARGA FINAL | Bent Over Row: 3x6 @ 60%'),
(p5w8d2,'94e11eb6-9fee-4116-a873-0001d041027b',2,3,8,null,'21X0',60,'Cable Low Row');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w8d3,'25ecd04b-dc05-453a-aa1e-ff658f46df49',1,3,5,60,'31X0',90,'Bench Press: 3x5 @ 60%'),
(p5w8d3,'8ee3a36d-d51b-4e5f-aa30-4aa773edb1b9',2,3,4,55,'10X0',90,'Push Press: 3x4 @ 55%');
INSERT INTO program_day_workouts (program_day_id, exercise_id, order_index, sets, reps, load, tempo, rest_seconds, notes) VALUES
(p5w8d4,'62dcfe55-6604-4584-b029-fb37a2c0de3b',1,3,5,60,'31X0',90,'Row: 3x5 @ 60%'),
(p5w8d4,'94e11eb6-9fee-4116-a873-0001d041027b',2,3,8,null,'21X0',60,'Cable Low Row');

UPDATE program_products SET duration_weeks = 8 WHERE id IN (p4, p5);

END $$;
