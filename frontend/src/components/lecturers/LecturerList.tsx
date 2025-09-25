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
import { Edit, Delete, Visibility, Schedule } from '@mui/icons-material';
import { Lecturer } from '../../types/entities';

interface LecturerListProps {
  lecturers: Lecturer[];
  onEdit: (lecturer: Lecturer) => void;
  onDelete: (lecturerId: string) => void;
  onView: (lecturer: Lecturer) => void;
  onManageAvailability: (lecturer: Lecturer) => void;
}

export const LecturerList: React.FC<LecturerListProps> = ({
  lecturers,
  onEdit,
  onDelete,
  onView,
  onManageAvailability,
}) => {
  const formatSubjects = (subjects: string[]) => {
    if (subjects.length === 0) return 'None';
    if (subjects.length <= 2) return subjects.join(', ');
    return `${subjects.slice(0, 2).join(', ')} +${subjects.length - 2} more`;
  };

  const getAvailabilityCount = (lecturer: Lecturer) => {
    const totalSlots = Object.values(lecturer.availability).reduce(
      (total, daySlots) => total + daySlots.length,
      0
    );
    return totalSlots;
  };

  if (lecturers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No lecturers found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first lecturer to get started
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Subjects</TableCell>
            <TableCell align="center">Hours/Week</TableCell>
            <TableCell align="center">Availability</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lecturers.map((lecturer) => (
            <TableRow key={lecturer.id} hover>
              <TableCell>
                <Typography variant="subtitle2">
                  {lecturer.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {lecturer.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={lecturer.department}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Tooltip title={lecturer.subjects.join(', ') || 'No subjects'}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {formatSubjects(lecturer.subjects)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2">
                  {lecturer.maxHoursPerWeek}h
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={`${getAvailabilityCount(lecturer)} slots`}
                  size="small"
                  color={getAvailabilityCount(lecturer) > 0 ? 'success' : 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onView(lecturer)}
                      color="info"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Manage Availability">
                    <IconButton
                      size="small"
                      onClick={() => onManageAvailability(lecturer)}
                      color="secondary"
                    >
                      <Schedule />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(lecturer)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(lecturer.id)}
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