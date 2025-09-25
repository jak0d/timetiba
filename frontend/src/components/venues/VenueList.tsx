import React, { useState } from 'react';
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
import { Edit, Delete, Visibility } from '@mui/icons-material';
import { Venue } from '../../types/entities';

interface VenueListProps {
  venues: Venue[];
  onEdit: (venue: Venue) => void;
  onDelete: (venueId: string) => void;
  onView: (venue: Venue) => void;
}

export const VenueList: React.FC<VenueListProps> = ({
  venues,
  onEdit,
  onDelete,
  onView,
}) => {
  const formatEquipment = (equipment: Venue['equipment']) => {
    if (equipment.length === 0) return 'None';
    if (equipment.length <= 3) {
      return equipment.map(eq => eq.name).join(', ');
    }
    return `${equipment.slice(0, 3).map(eq => eq.name).join(', ')} +${equipment.length - 3} more`;
  };

  const formatAccessibility = (accessibility: Venue['accessibility']) => {
    return accessibility.length > 0 ? accessibility.length : 'None';
  };

  if (venues.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No venues found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first venue to get started
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
            <TableCell>Location</TableCell>
            <TableCell align="right">Capacity</TableCell>
            <TableCell>Equipment</TableCell>
            <TableCell align="center">Accessibility</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {venues.map((venue) => (
            <TableRow key={venue.id} hover>
              <TableCell>
                <Typography variant="subtitle2">
                  {venue.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {venue.location}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={venue.capacity}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Tooltip title={venue.equipment.map(eq => eq.name).join(', ') || 'No equipment'}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {formatEquipment(venue.equipment)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={formatAccessibility(venue.accessibility)}
                  size="small"
                  color={venue.accessibility.length > 0 ? 'success' : 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onView(venue)}
                      color="info"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(venue)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(venue.id)}
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