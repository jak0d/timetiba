import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import { Venue, Equipment, EquipmentType, AccessibilityFeature } from '../../types/entities';

interface VenueFormProps {
  open: boolean;
  venue?: Venue;
  onClose: () => void;
  onSubmit: (venue: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const VenueForm: React.FC<VenueFormProps> = ({
  open,
  venue,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    capacity: 0,
    location: '',
    equipment: [] as Equipment[],
    accessibility: [] as AccessibilityFeature[],
  });

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    type: EquipmentType.PROJECTOR,
    description: '',
  });

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name,
        capacity: venue.capacity,
        location: venue.location,
        equipment: venue.equipment,
        accessibility: venue.accessibility,
      });
    } else {
      setFormData({
        name: '',
        capacity: 0,
        location: '',
        equipment: [],
        accessibility: [],
      });
    }
  }, [venue, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleAddEquipment = () => {
    if (newEquipment.name.trim()) {
      const equipment: Equipment = {
        id: Date.now().toString(),
        name: newEquipment.name,
        type: newEquipment.type,
        description: newEquipment.description || undefined,
      };
      setFormData(prev => ({
        ...prev,
        equipment: [...prev.equipment, equipment],
      }));
      setNewEquipment({
        name: '',
        type: EquipmentType.PROJECTOR,
        description: '',
      });
    }
  };

  const handleRemoveEquipment = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.filter(eq => eq.id !== equipmentId),
    }));
  };

  const handleAccessibilityChange = (feature: AccessibilityFeature, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      accessibility: checked
        ? [...prev.accessibility, feature]
        : prev.accessibility.filter(f => f !== feature),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {venue ? 'Edit Venue' : 'Add New Venue'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Venue Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
              />
            </Grid>

            {/* Equipment Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Equipment
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Equipment Name"
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={newEquipment.type}
                        onChange={(e) => setNewEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                        label="Type"
                      >
                        {Object.values(EquipmentType).map(type => (
                          <MenuItem key={type} value={type}>
                            {type.replace('_', ' ').toUpperCase()}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={newEquipment.description}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      variant="outlined"
                      onClick={handleAddEquipment}
                      disabled={!newEquipment.name.trim()}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.equipment.map((equipment) => (
                  <Chip
                    key={equipment.id}
                    label={`${equipment.name} (${equipment.type})`}
                    onDelete={() => handleRemoveEquipment(equipment.id)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>

            {/* Accessibility Features */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Accessibility Features
              </Typography>
              <FormGroup>
                {Object.values(AccessibilityFeature).map(feature => (
                  <FormControlLabel
                    key={feature}
                    control={
                      <Checkbox
                        checked={formData.accessibility.includes(feature)}
                        onChange={(e) => handleAccessibilityChange(feature, e.target.checked)}
                      />
                    }
                    label={feature.replace('_', ' ').toUpperCase()}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {venue ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};