import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  Paper,
  Alert,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { Venue } from '../types/entities';
import { VenueForm } from '../components/venues/VenueForm';
import { VenueList } from '../components/venues/VenueList';
import { VenueDetails } from '../components/venues/VenueDetails';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

const Venues: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Selected items
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null);

  // Mock data for development - replace with API calls
  useEffect(() => {
    const mockVenues: Venue[] = [
      {
        id: '1',
        name: 'Main Lecture Hall',
        capacity: 200,
        location: 'Building A, Floor 1',
        equipment: [
          { id: '1', name: 'Digital Projector', type: 'projector' as any, description: 'HD 1080p projector' },
          { id: '2', name: 'Sound System', type: 'audio_system' as any },
        ],
        accessibility: ['wheelchair_accessible' as any, 'hearing_loop' as any],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '2',
        name: 'Computer Lab 1',
        capacity: 30,
        location: 'Building B, Floor 2',
        equipment: [
          { id: '3', name: 'Desktop Computers', type: 'computer' as any, description: '30 workstations' },
          { id: '4', name: 'Interactive Whiteboard', type: 'whiteboard' as any },
        ],
        accessibility: ['wheelchair_accessible' as any],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
      },
    ];

    setTimeout(() => {
      setVenues(mockVenues);
      setFilteredVenues(mockVenues);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter venues based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredVenues(venues);
    } else {
      const filtered = venues.filter(venue =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVenues(filtered);
    }
  }, [searchTerm, venues]);

  const handleAddVenue = () => {
    setSelectedVenue(null);
    setFormOpen(true);
  };

  const handleEditVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setFormOpen(true);
  };

  const handleViewVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setDetailsOpen(true);
  };

  const handleDeleteVenue = (venueId: string) => {
    setVenueToDelete(venueId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (venueToDelete) {
      setVenues(prev => prev.filter(venue => venue.id !== venueToDelete));
      setVenueToDelete(null);
    }
    setConfirmDeleteOpen(false);
  };

  const handleSubmitVenue = (venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedVenue) {
      // Update existing venue
      setVenues(prev => prev.map(venue =>
        venue.id === selectedVenue.id
          ? { ...venue, ...venueData, updatedAt: new Date() }
          : venue
      ));
    } else {
      // Add new venue
      const newVenue: Venue = {
        ...venueData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setVenues(prev => [...prev, newVenue]);
    }
    setFormOpen(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading venues..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Venues
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage venue information, capacity, and equipment details.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddVenue}
        >
          Add Venue
        </Button>
      </Box>

      {error && (
        <ErrorMessage message={error} />
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search venues by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <VenueList
        venues={filteredVenues}
        onEdit={handleEditVenue}
        onDelete={handleDeleteVenue}
        onView={handleViewVenue}
      />

      <VenueForm
        open={formOpen}
        venue={selectedVenue}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitVenue}
      />

      <VenueDetails
        open={detailsOpen}
        venue={selectedVenue}
        onClose={() => setDetailsOpen(false)}
        onEdit={handleEditVenue}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Venue"
        message="Are you sure you want to delete this venue? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default Venues;