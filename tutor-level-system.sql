-- Tutor Level System Database Migration
-- Adds columns to profiles table for tutor leveling and pay tracking

-- Add tutor level system columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tutor_level INTEGER DEFAULT 1 CHECK (tutor_level >= 1 AND tutor_level <= 5),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 18.00 CHECK (hourly_rate >= 0),
ADD COLUMN IF NOT EXISTS completed_classes INTEGER DEFAULT 0 CHECK (completed_classes >= 0),
ADD COLUMN IF NOT EXISTS total_hours_taught DECIMAL(10, 2) DEFAULT 0 CHECK (total_hours_taught >= 0);

-- Create index for faster queries on tutor level
CREATE INDEX IF NOT EXISTS idx_profiles_tutor_level ON profiles(tutor_level) WHERE role = 'tutor';
CREATE INDEX IF NOT EXISTS idx_profiles_completed_classes ON profiles(completed_classes) WHERE role = 'tutor';

-- Function to automatically calculate tutor level based on completed classes
CREATE OR REPLACE FUNCTION calculate_tutor_level(classes_completed INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF classes_completed >= 100 THEN
    RETURN 5;  -- Master
  ELSIF classes_completed >= 50 THEN
    RETURN 4;  -- Expert
  ELSIF classes_completed >= 25 THEN
    RETURN 3;  -- Experienced
  ELSIF classes_completed >= 10 THEN
    RETURN 2;  -- Rising Star
  ELSE
    RETURN 1;  -- Newcomer
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get default hourly rate for a level
CREATE OR REPLACE FUNCTION get_default_hourly_rate(level INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  CASE level
    WHEN 5 THEN RETURN 25.00;  -- Master
    WHEN 4 THEN RETURN 23.00;  -- Expert
    WHEN 3 THEN RETURN 21.00;  -- Experienced
    WHEN 2 THEN RETURN 19.50;  -- Rising Star
    ELSE RETURN 18.00;         -- Newcomer (Level 1)
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tutor level when completed_classes changes
CREATE OR REPLACE FUNCTION update_tutor_level_on_class_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'tutor' AND NEW.completed_classes != OLD.completed_classes THEN
    NEW.tutor_level = calculate_tutor_level(NEW.completed_classes);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tutor_level
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.completed_classes IS DISTINCT FROM NEW.completed_classes)
EXECUTE FUNCTION update_tutor_level_on_class_completion();

-- Update existing tutors to have proper initial values
UPDATE profiles
SET
  tutor_level = COALESCE(tutor_level, 1),
  hourly_rate = COALESCE(hourly_rate, 18.00),
  completed_classes = COALESCE(completed_classes, 0),
  total_hours_taught = COALESCE(total_hours_taught, 0)
WHERE role = 'tutor';

COMMENT ON COLUMN profiles.tutor_level IS 'Tutor level (1-5): 1=Newcomer, 2=Rising Star, 3=Experienced, 4=Expert, 5=Master';
COMMENT ON COLUMN profiles.hourly_rate IS 'Tutor hourly pay rate in dollars';
COMMENT ON COLUMN profiles.completed_classes IS 'Total number of completed classes taught';
COMMENT ON COLUMN profiles.total_hours_taught IS 'Total hours of instruction delivered';
