import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Venues from '../pages/Venues';
import Lecturers from '../pages/Lecturers';
import Courses from '../pages/Courses';
import StudentGroups from '../pages/StudentGroups';
import Timetables from '../pages/Timetables';
import Settings from '../pages/Settings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/venues" element={<Venues />} />
      <Route path="/lecturers" element={<Lecturers />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/student-groups" element={<StudentGroups />} />
      <Route path="/timetables" element={<Timetables />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};