-- Migration: Create base tables for AI Timetabler
-- Version: 001
-- Description: Creates the core entity tables (venues, lecturers, courses, student_groups)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

CREATE TYPE equipment_type AS ENUM (
  'projector', 'computer', 'whiteboard', 'smartboard', 'audio_system', 
  'video_conferencing', 'laboratory_equipment', 'specialized_software'
);

CREATE TYPE accessibility_feature AS ENUM (
  'wheelchair_accessible', 'hearing_loop', 'visual_aids', 'elevator_access'
);

CREATE TYPE frequency_type AS ENUM (
  'once', 'daily', 'weekly', 'biweekly', 'monthly'
);

CREATE TYPE priority_level AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE severity_level AS ENUM (
  'info', 'warning', 'error', 'critical'
);

-- Venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  equipment equipment_type[] DEFAULT '{}',
  location VARCHAR(500) NOT NULL,
  accessibility accessibility_feature[] DEFAULT '{}',
  building VARCHAR(100),
  floor INTEGER,
  room_number VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venue availability table (separate table for flexibility)
CREATE TABLE venue_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Lecturers table
CREATE TABLE lecturers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  department VARCHAR(255) NOT NULL,
  subjects TEXT[] NOT NULL,
  max_hours_per_day INTEGER NOT NULL CHECK (max_hours_per_day > 0),
  max_hours_per_week INTEGER NOT NULL CHECK (max_hours_per_week > 0),
  employee_id VARCHAR(50),
  phone VARCHAR(20),
  title VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer availability table
CREATE TABLE lecturer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Lecturer preferences table
CREATE TABLE lecturer_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  max_hours_per_day INTEGER NOT NULL,
  max_hours_per_week INTEGER NOT NULL,
  minimum_break_between_classes INTEGER NOT NULL DEFAULT 15,
  preferred_days day_of_week[] DEFAULT '{}',
  avoid_back_to_back_classes BOOLEAN DEFAULT false,
  preferred_venues UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lecturer_id)
);

-- Lecturer preferred time slots table
CREATE TABLE lecturer_preferred_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Student groups table
CREATE TABLE student_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0),
  year_level INTEGER NOT NULL CHECK (year_level > 0),
  department VARCHAR(255) NOT NULL,
  program VARCHAR(255),
  semester INTEGER CHECK (semester > 0),
  academic_year VARCHAR(9) CHECK (academic_year ~ '^\d{4}-\d{4}$'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL CHECK (duration >= 15), -- minimum 15 minutes
  frequency frequency_type NOT NULL,
  required_equipment equipment_type[] DEFAULT '{}',
  lecturer_id UUID NOT NULL REFERENCES lecturers(id),
  department VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL CHECK (credits >= 0),
  description TEXT,
  prerequisites UUID[] DEFAULT '{}', -- course IDs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course-student group relationship table (many-to-many)
CREATE TABLE course_student_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_group_id)
);

-- Course constraints table
CREATE TABLE course_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE INDEX idx_venues_building ON venues(building);
CREATE INDEX idx_venues_is_active ON venues(is_active);
CREATE INDEX idx_venue_availability_venue_id ON venue_availability(venue_id);
CREATE INDEX idx_venue_availability_day ON venue_availability(day_of_week);

CREATE INDEX idx_lecturers_department ON lecturers(department);
CREATE INDEX idx_lecturers_email ON lecturers(email);
CREATE INDEX idx_lecturers_is_active ON lecturers(is_active);
CREATE INDEX idx_lecturer_availability_lecturer_id ON lecturer_availability(lecturer_id);
CREATE INDEX idx_lecturer_availability_day ON lecturer_availability(day_of_week);

CREATE INDEX idx_student_groups_department ON student_groups(department);
CREATE INDEX idx_student_groups_year_level ON student_groups(year_level);
CREATE INDEX idx_student_groups_is_active ON student_groups(is_active);

CREATE INDEX idx_courses_lecturer_id ON courses(lecturer_id);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_is_active ON courses(is_active);
CREATE INDEX idx_course_student_groups_course_id ON course_student_groups(course_id);
CREATE INDEX idx_course_student_groups_student_group_id ON course_student_groups(student_group_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecturers_updated_at BEFORE UPDATE ON lecturers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecturer_preferences_updated_at BEFORE UPDATE ON lecturer_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_groups_updated_at BEFORE UPDATE ON student_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();