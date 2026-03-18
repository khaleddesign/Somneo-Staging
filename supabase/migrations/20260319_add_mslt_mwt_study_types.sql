-- T0: Extend study_type CHECK constraint to include MSLT and MWT
-- MSLT = Multiple Sleep Latency Test
-- MWT  = Maintenance of Wakefulness Test

ALTER TABLE studies DROP CONSTRAINT IF EXISTS studies_study_type_check;

ALTER TABLE studies
  ADD CONSTRAINT studies_study_type_check
  CHECK (study_type IN ('PSG', 'PV', 'MSLT', 'MWT'));
