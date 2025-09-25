-- Migration: Create scheduling and constraint tables
-- Version: 002
-- Description: Creates tables for schedules, constraints, clashes, and sessions

-- Create additional enum types for scheduling
CREATE TYPE schedule_status AS ENUM (
  'draft', 'published', 'archived', 'under_review'
);

CREATE TYPE constraint_type AS ENUM (
  'hard_availability', 'venue_capacity', 'equipment_requirement', 
  'lecturer_preference', 'student_break', 'department_policy',
  'time_window', 'consecutive_sessions'
);

CREATE TYPE clash_type AS ENUM (
  'venue_double_booking', 'lecturer_conflict', 'student_group_overlap',
  'equipment_conflict', 'capacity_exceeded', 'availability_violation',
  'preference_violation'
);

CREATE TYPE resolution_type AS ENUM (
  'reschedule', 'reassign_venue', 'reassign_lecturer', 'split_group', 'modify_duration'
);

CREATE TYPE effort_level AS ENUM (
  'low', 'medium', 'high'
);

-- Schedules table
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  academic_period VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  status schedule_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID, -- Reference to user when user management is implemented
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Scheduled sessions table
CREATE TABLE scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id),
  venue_id UUID NOT NULL REFERENCES venues(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  day_of_week day_of_week NOT NULL,
  week_number INTEGER CHECK (week_number >= 1 AND week_number <= 53),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_session_time CHECK (end_time > start_time)
);

-- Session-student group relationship table (many-to-many)
CREATE TABLE session_student_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
  student_group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, student_group_id)
);

-- Constraints table
CREATE TABLE constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type constraint_type NOT NULL,
  priority priority_level NOT NULL,
  description VARCHAR(500) NOT NULL,
  weight DECIMAL(3,2) CHECK (weight >= 0 AND weight <= 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint entities table (many-to-many relationship)
CREATE TABLE constraint_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constraint_id UUID NOT NULL REFERENCES constraints(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- Can reference any entity (venue, lecturer, course, etc.)
  entity_type VARCHAR(50) NOT NULL, -- 'venue', 'lecturer', 'course', 'student_group'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(constraint_id, entity_id, entity_type)
);

-- Constraint rules table
CREATE TABLE constraint_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constraint_id UUID NOT NULL REFERENCES constraints(id) ON DELETE CASCADE,
  field VARCHAR(100) NOT NULL,
  operator VARCHAR(20) NOT NULL CHECK (operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'in', 'not_in', 'between')),
  value JSONB NOT NULL,
  message VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(constraint_id)
);

-- Clashes table
CREATE TABLE clashes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type clash_type NOT NULL,
  severity severity_level NOT NULL,
  description VARCHAR(500) NOT NULL,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID, -- Reference to user when user management is implemented
  applied_resolution UUID, -- Reference to resolution that was applied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clash affected entities table
CREATE TABLE clash_affected_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clash_id UUID NOT NULL REFERENCES clashes(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clash affected sessions table
CREATE TABLE clash_affected_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clash_id UUID NOT NULL REFERENCES clashes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clash_id, session_id)
);

-- Resolutions table
CREATE TABLE resolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clash_id UUID NOT NULL REFERENCES clashes(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  type resolution_type NOT NULL,
  parameters JSONB DEFAULT '{}',
  impact VARCHAR(500) NOT NULL,
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  estimated_effort effort_level NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scheduling tables
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_academic_period ON schedules(academic_period);
CREATE INDEX idx_schedules_date_range ON schedules(start_date, end_date);

CREATE INDEX idx_scheduled_sessions_schedule_id ON scheduled_sessions(schedule_id);
CREATE INDEX idx_scheduled_sessions_course_id ON scheduled_sessions(course_id);
CREATE INDEX idx_scheduled_sessions_lecturer_id ON scheduled_sessions(lecturer_id);
CREATE INDEX idx_scheduled_sessions_venue_id ON scheduled_sessions(venue_id);
CREATE INDEX idx_scheduled_sessions_time_range ON scheduled_sessions(start_time, end_time);
CREATE INDEX idx_scheduled_sessions_day_week ON scheduled_sessions(day_of_week);

CREATE INDEX idx_session_student_groups_session_id ON session_student_groups(session_id);
CREATE INDEX idx_session_student_groups_student_group_id ON session_student_groups(student_group_id);

CREATE INDEX idx_constraints_type ON constraints(type);
CREATE INDEX idx_constraints_priority ON constraints(priority);
CREATE INDEX idx_constraints_is_active ON constraints(is_active);

CREATE INDEX idx_constraint_entities_constraint_id ON constraint_entities(constraint_id);
CREATE INDEX idx_constraint_entities_entity ON constraint_entities(entity_id, entity_type);

CREATE INDEX idx_clashes_schedule_id ON clashes(schedule_id);
CREATE INDEX idx_clashes_type ON clashes(type);
CREATE INDEX idx_clashes_severity ON clashes(severity);
CREATE INDEX idx_clashes_is_resolved ON clashes(is_resolved);

CREATE INDEX idx_clash_affected_entities_clash_id ON clash_affected_entities(clash_id);
CREATE INDEX idx_clash_affected_entities_entity ON clash_affected_entities(entity_id, entity_type);

CREATE INDEX idx_clash_affected_sessions_clash_id ON clash_affected_sessions(clash_id);
CREATE INDEX idx_clash_affected_sessions_session_id ON clash_affected_sessions(session_id);

CREATE INDEX idx_resolutions_clash_id ON resolutions(clash_id);
CREATE INDEX idx_resolutions_score ON resolutions(score);

-- Create triggers for updated_at
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_sessions_updated_at BEFORE UPDATE ON scheduled_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constraints_updated_at BEFORE UPDATE ON constraints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clashes_updated_at BEFORE UPDATE ON clashes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();