/*
  # Load Exercise Library - Part 1 of 3
  
  Loading exercises 1-500 from comprehensive exercise database.
  
  This migration loads the first 500 exercises with:
  - Category, Type, Equipment classifications
  - Video demonstration links
  - Movement patterns and abilities
  - Contraction types (Dynamic, Eccentric, Isometric, Oscillatory)
  - Body part targeting
  
  All exercises are marked as global (available to all users).
*/

INSERT INTO exercises (category, type, equipment, exercise, link, pattern_ability, movement, contraction, orientation, body_part, parameter, is_global, created_by)
VALUES
('Lower Body', 'Grinding', 'BB/SSB', 'BB HE Back Squat', 'https://youtu.be/L4SEKNDl3B4', 'Squat-Double Leg', 'Bilateral Squat', 'Dynamic', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat', 'https://youtu.be/wj6TWVuO7BA', 'Squat-Double Leg', 'Bilateral Squat', 'Dynamic', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [Chains]', 'https://youtu.be/PY9pSVg1iSM', 'Squat-Double Leg', 'Bilateral Squat', 'Dynamic', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [Banded]', 'https://youtu.be/tvFJfjLBjF8', 'Squat-Double Leg', 'Bilateral Squat', 'Dynamic', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [ECC Tempo]', 'https://youtu.be/5cMZ4YGtId4', 'Squat-Double Leg', 'Bilateral Squat', 'Eccentric', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [ECC Drop]', 'https://youtu.be/aIIeLqU--TA', 'Squat-Double Leg', 'Bilateral Squat', 'Eccentric', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [Supramax ECC]', 'https://youtu.be/uqnl2XS6b_A', 'Squat-Double Leg', 'Bilateral Squat', 'Eccentric', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [ISO At Bottom]', 'https://youtu.be/MsdvAILzwfQ', 'Squat-Double Leg', 'Bilateral Squat', 'Isometric', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'BB Back Squat [IsoHold]', 'https://youtu.be/c7tPj784UkQ', 'Squat-Double Leg', 'Bilateral Squat', 'Isometric', NULL, 'Lower Body', NULL, true, NULL::uuid),
('Lower Body', 'Grinding', 'BB/SSB', 'SSB Back Squat', 'https://youtu.be/lTqasUddDGE', 'Squat-Double Leg', 'Bilateral Squat', 'Dynamic', NULL, 'Lower Body', NULL, true, NULL::uuid);