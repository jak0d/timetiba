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
import { Edit, Delete, Visibility, School, Group } from '@mui/icons-material';
import { StudentGroup } from '../../types/entities';

interface StudentGroupListProps {
  studentGroups: StudentGroup[];
  onEdit: (studentGroup: StudentGroup) => void;
  onDelete: (studentGroupId: string) => void;
  onView: (studentGroup: StudentGroup) => void;
  getCourseNames?: (courseIds: string[]) => string[];
}

export const StudentGroupList: React.FC<StudentGroupListProps> = ({
  studentGroups,
  onEdit,
  onDelete,
  onView,
  getCourseNames = () => [],
}) => {
  const formatCourses = (courseIds: string[]) => {
    const courseNames = getCourseNames(courseIds);
    if (courseNames.length === 0) return 'No courses';
    if (courseNames.length <= 2) return courseNames.join(', ');
    return `${courseNames.slice(0, 2).join(', ')} +${courseNames.length - 2} more`;
  };

  const getYearLevelColor = (yearLevel: number) => {
    switch (yearLevel) {
      case 1: return 'success';
      case 2: return 'info';
      case 3: return 'warning';
      case 4: return 'error';
      default: return 'default';
    }
  };

  if (studentGroups.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No student groups found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first student group to get started
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Group Name</TableCell>
            <TableCell>Department</TableCell>
            <TableCell align="center">Year Level</TableCell>
            <TableCell align="center">Size</TableCell>
            <TableCell>Enrolled Courses</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {studentGroups.map((group) => (
            <TableRow key={group.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Group color="action" />
                  <Typography variant="subtitle2">
                    {group.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={group.department}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={`Year ${group.yearLevel}`}
                  size="small"
                  color={getYearLevelColor(group.yearLevel) as any}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <School fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight="medium">
                    {group.size}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Tooltip title={getCourseNames(group.courses).join(', ') || 'No courses enrolled'}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {formatCourses(group.courses)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onView(group)}
                      color="info"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(group)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(group.id)}
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