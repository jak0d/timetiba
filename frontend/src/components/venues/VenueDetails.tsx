import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { LocationOn, People, Build, Accessible } from '@mui/icons-material';
import { Venue } from '../../types/entities';

interface VenueDetailsProps {
  open: boolean;
  venue: Venue | null;
  onClose: () => void;
  onEdit: (venue: Venue) => void;
}

export const VenueDetails: React.FC<VenueDetailsProps> = ({
  open,
  venue,
  onClose,
  onEdit,
}) => {
  if (!venue) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" component="span">
            {venue.name}
          </Typography>
          <Chip
            label={`Capacity: ${venue.capacity}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationOn color="action" />
              <Typography variant="body1">
                <strong>Location:</strong> {venue.location}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <People color="action" />
              <Typography variant="body1">
                <strong>Capacity:</strong> {venue.capacity} people
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Equipment */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Build color="action" />
              <Typography variant="h6">Equipment</Typography>
            </Box>
            {venue.equipment.length > 0 ? (
              <List dense>
                {venue.equipment.map((equipment) => (
                  <ListItem key={equipment.id} sx={{ pl: 0 }}>
                    <ListItemText
                      primary={equipment.name}
                      secondary={
                        <Box>
                          <Chip
                            label={equipment.type.replace('_', ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          {equipment.description && (
                            <Typography variant="caption" color="text.secondary">
                              {equipment.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No equipment available
              </Typography>
            )}
          </Grid>

          {/* Accessibility Features */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Accessible color="action" />
              <Typography variant="h6">Accessibility Features</Typography>
            </Box>
            {venue.accessibility.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {venue.accessibility.map((feature) => (
                  <Chip
                    key={feature}
                    label={feature.replace('_', ' ').toUpperCase()}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No accessibility features specified
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Metadata */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Record Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Created:</strong> {formatDate(venue.createdAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Last Updated:</strong> {formatDate(venue.updatedAt)}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => {
            onEdit(venue);
            onClose();
          }}
        >
          Edit Venue
        </Button>
      </DialogActions>
    </Dialog>
  );
};