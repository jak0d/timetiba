import { renderHook, act } from '@testing-library/react';
import { useVenueStore } from '../venueStore';
import { venueApi } from '../../services/venueApi';
import { Venue } from '../../types/entities';

// Mock the venue API
jest.mock('../../services/venueApi');
const mockedVenueApi = venueApi as jest.Mocked<typeof venueApi>;

describe('useVenueStore', () => {
  const mockVenue: Venue = {
    id: '1',
    name: 'Test Venue',
    capacity: 100,
    equipment: ['projector', 'whiteboard'],
    location: 'Building A, Room 101',
    accessibility: ['wheelchair_accessible'],
    availability: [],
  };

  beforeEach(() => {
    // Reset store state
    useVenueStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useVenueStore());

      expect(result.current.items).toEqual([]);
      expect(result.current.selectedItem).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.optimisticUpdates).toEqual([]);
    });
  });

  describe('fetchItems', () => {
    it('should fetch venues successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockVenue],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        timestamp: new Date(),
      };

      mockedVenueApi.getVenues.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useVenueStore());

      await act(async () => {
        await result.current.fetchItems();
      });

      expect(result.current.items).toEqual([mockVenue]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch venues';
      mockedVenueApi.getVenues.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useVenueStore());

      await act(async () => {
        await result.current.fetchItems();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedVenueApi.getVenues.mockReturnValue(promise as any);

      const { result } = renderHook(() => useVenueStore());

      act(() => {
        result.current.fetchItems();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          data: [mockVenue],
          timestamp: new Date(),
        });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('createItem', () => {
    it('should create venue successfully', async () => {
      const newVenue = {
        name: 'New Venue',
        capacity: 50,
        equipment: ['projector'],
        location: 'Building B, Room 201',
        accessibility: [],
      };

      const mockResponse = {
        success: true,
        data: { ...newVenue, id: '2' } as Venue,
        timestamp: new Date(),
      };

      mockedVenueApi.createVenue.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useVenueStore());

      await act(async () => {
        await result.current.createItem(newVenue);
      });

      expect(result.current.items).toContainEqual(mockResponse.data);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle create error', async () => {
      const newVenue = {
        name: 'New Venue',
        capacity: 50,
        equipment: ['projector'],
        location: 'Building B, Room 201',
        accessibility: [],
      };

      const errorMessage = 'Failed to create venue';
      mockedVenueApi.createVenue.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useVenueStore());

      await act(async () => {
        await result.current.createItem(newVenue);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('updateItem', () => {
    it('should update venue successfully', async () => {
      const updatedVenue = { ...mockVenue, name: 'Updated Venue' };
      const mockResponse = {
        success: true,
        data: updatedVenue,
        timestamp: new Date(),
      };

      mockedVenueApi.updateVenue.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useVenueStore());

      // Set initial state with venue
      act(() => {
        result.current.items = [mockVenue];
      });

      await act(async () => {
        await result.current.updateItem('1', { name: 'Updated Venue' });
      });

      expect(result.current.items[0]).toEqual(updatedVenue);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('deleteItem', () => {
    it('should delete venue successfully', async () => {
      const mockResponse = {
        success: true,
        timestamp: new Date(),
      };

      mockedVenueApi.deleteVenue.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useVenueStore());

      // Set initial state with venue
      act(() => {
        result.current.items = [mockVenue];
      });

      await act(async () => {
        await result.current.deleteItem('1');
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('selectItem', () => {
    it('should select venue', () => {
      const { result } = renderHook(() => useVenueStore());

      act(() => {
        result.current.selectItem(mockVenue);
      });

      expect(result.current.selectedItem).toEqual(mockVenue);
    });

    it('should deselect venue', () => {
      const { result } = renderHook(() => useVenueStore());

      act(() => {
        result.current.selectItem(mockVenue);
      });

      expect(result.current.selectedItem).toEqual(mockVenue);

      act(() => {
        result.current.selectItem(null);
      });

      expect(result.current.selectedItem).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useVenueStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useVenueStore());

      // Set some state
      act(() => {
        result.current.items = [mockVenue];
        result.current.selectedItem = mockVenue;
        result.current.setError('Test error');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.selectedItem).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastUpdated).toBeNull();
    });
  });
});