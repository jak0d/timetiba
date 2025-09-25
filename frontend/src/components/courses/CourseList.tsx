import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import { Edit, Delete, Visibility, Group, Build } from '@mui/icons-material';
import { Course } from '../../types/entities';

interface CourseListProps {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
  onView: (course: Course) => void;
  getLecturerName?: (lecturerId: string) => string;
  getStudentGroupNames?: (groupIds: string[]) => string[];
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  onEdit,
  onDelete,
  onView,
  getLecturerName = () => 'Unknown',
  getStudentGroupNames = () => [],
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const formatStudentGroups = (groupIds: string[]) => {
    const groupNames = getStudentGroupNames(groupIds);
    if (groupNames.length === 0) return 'None';
    if (groupNames.length <= 2) return groupNames.join(', ');
    return `${groupNames.slice(0, 2).join(', ')} +${groupNames.length - 2} more`;
  };

  if (courses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No courses found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first course to get started
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Course</TableCell>
            <TableCell>Lecturer</TableCell>
            <TableCell align="center">Duration</TableCell>
            <TableCell align="center">Frequency</TableCell>
            <TableCell>Student Groups</TableCell>
            <TableCell align="center">Equipment</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id} hover>
              <TableCell>
                <Box>
                  <Typography variant="subtitle2">
                    {course.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {course.code}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {getLecturerName(course.lecturerId)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={formatDuration(course.duration)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={formatFrequency(course.frequency)}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Group fontSize="small" color="action" />
                  <Tooltip title={getStudentGroupNames(course.studentGroups).join(', ') || 'No groups assigned'}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {formatStudentGroups(course.studentGroups)}
                    </Typography>
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Build fontSize="small" color="action" />
                  <Chip
                    label={course.requiredEquipment.length}
                    size="small"
                    color={course.requiredEquipment.length > 0 ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onView(course)}
                      color="info"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(course)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(course.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};