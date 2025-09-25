import { createBaseStore } from './baseStore';
import { venueApi } from '../services/venueApi';
import { Venue, CreateVenueRequest, UpdateVenueRequest } from '../types/entities';

// Create venue store using the base store factory
export const useVenueStore = createBaseStore<Venue, CreateVenueRequest, UpdateVenueRequest>(
  'venue',
  {
    getItems: (params) => venueApi.getVenues(params),
    getItem: (id) => venueApi.getVenue(id),
    createItem: (venue) => venueApi.createVenue(venue),
    updateItem: (id, venue) => venueApi.updateVenue(id, venue),
    deleteItem: (id) => venueApi.deleteVenue(id),
  },
  {
    enableOptimisticUpdates: true,
    cacheTimeout: 10 * 60 * 1000, // 10 minutes for venues
  }
);