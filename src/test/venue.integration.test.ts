import request from 'supertest';
import app from '../index';
import { setupTestDatabase, teardownTestDatabase, cleanTestData } from '../utils/testDatabase';
import { Equipment, AccessibilityFeature, DayOfWeek } from '../models/common';
import { CreateVenueRequest } from '../models/venue';

describe('Venue API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('POST /api/venues', () => {
    it('should create a new venue successfully', async () => {
      const venueData: CreateVenueRequest = {
        name: 'Test Lecture Hall',
        capacity: 100,
        equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
        availability: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            startTime: '09:00',
            endTime: '17:00'
          }
        ],
        location: 'Building A, Floor 1',
        accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
        building: 'Building A',
        floor: 1,
        roomNumber: 'A101',
        description: 'Large lecture hall with modern equipment'
      };

      const response = await request(app)
        .post('/api/venues')
        .send(venueData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: venueData.name,
        capacity: venueData.capacity,
        equipment: venueData.equipment,
        location: venueData.location,
        accessibility: venueData.accessibility,
        building: venueData.building,
        floor: venueData.floor,
        roomNumber: venueData.roomNumber,
        description: venueData.description
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.availability).toHaveLength(1);
    });

    it('should return validation error for invalid venue data', async () => {
      const invalidVenueData = {
        name: '', // Invalid: empty name
        capacity: -1, // Invalid: negative capacity
        equipment: ['INVALID_EQUIPMENT'], // Invalid equipment
        location: '',
        accessibility: []
      };

      const response = await request(app)
        .post('/api/venues')
        .send(invalidVenueData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle duplicate venue names', async () => {
      const venueData: CreateVenueRequest = {
        name: 'Duplicate Hall',
        capacity: 50,
        equipment: [],
        availability: [],
        location: 'Building B',
        accessibility: []
      };

      // Create first venue
      await request(app)
        .post('/api/venues')
        .send(venueData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/venues')
        .send(venueData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Venue with this name already exists');
    });
  });

  describe('GET /api/venues', () => {
    beforeEach(async () => {
      // Create test venues
      const venues = [
        {
          name: 'Small Room',
          capacity: 20,
          equipment: [Equipment.WHITEBOARD],
          availability: [],
          location: 'Building A',
          accessibility: [],
          building: 'Building A',
          floor: 1
        },
        {
          name: 'Large Hall',
          capacity: 200,
          equipment: [Equipment.PROJECTOR, Equipment.AUDIO_SYSTEM],
          availability: [],
          location: 'Building B',
          accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
          building: 'Building B',
          floor: 2
        }
      ];

      for (const venue of venues) {
        await request(app).post('/api/venues').send(venue);
      }
    });

    it('should return all venues', async () => {
      const response = await request(app)
        .get('/api/venues')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.message).toContain('Found 2 venues');
    });

    it('should filter venues by capacity', async () => {
      const response = await request(app)
        .get('/api/venues?minCapacity=50&maxCapacity=300')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Large Hall');
    });

    it('should filter venues by building', async () => {
      const response = await request(app)
        .get('/api/venues?building=Building A')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Small Room');
    });

    it('should filter venues by equipment', async () => {
      const response = await request(app)
        .get('/api/venues?equipment=PROJECTOR,AUDIO_SYSTEM')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Large Hall');
    });
  });

  describe('GET /api/venues/:id', () => {
    let venueId: string;

    beforeEach(async () => {
      const venueData: CreateVenueRequest = {
        name: 'Test Venue',
        capacity: 50,
        equipment: [Equipment.PROJECTOR],
        availability: [],
        location: 'Test Location',
        accessibility: []
      };

      const response = await request(app)
        .post('/api/venues')
        .send(venueData);

      venueId = response.body.data.id;
    });

    it('should return venue by ID', async () => {
      const response = await request(app)
        .get(`/api/venues/${venueId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(venueId);
      expect(response.body.data.name).toBe('Test Venue');
    });

    it('should return 404 for non-existent venue', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/venues/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Venue not found');
    });
  });

  describe('PUT /api/venues/:id', () => {
    let venueId: string;

    beforeEach(async () => {
      const venueData: CreateVenueRequest = {
        name: 'Original Venue',
        capacity: 50,
        equipment: [Equipment.WHITEBOARD],
        availability: [],
        location: 'Original Location',
        accessibility: []
      };

      const response = await request(app)
        .post('/api/venues')
        .send(venueData);

      venueId = response.body.data.id;
    });

    it('should update venue successfully', async () => {
      const updateData = {
        name: 'Updated Venue',
        capacity: 75,
        equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
        location: 'Updated Location'
      };

      const response = await request(app)
        .put(`/api/venues/${venueId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Venue');
      expect(response.body.data.capacity).toBe(75);
      expect(response.body.data.equipment).toContain(Equipment.PROJECTOR);
      expect(response.body.message).toBe('Venue updated successfully');
    });

    it('should return 404 for non-existent venue update', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/venues/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Venue not found');
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        capacity: -10, // Invalid capacity
        equipment: ['INVALID_EQUIPMENT']
      };

      const response = await request(app)
        .put(`/api/venues/${venueId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('DELETE /api/venues/:id', () => {
    let venueId: string;

    beforeEach(async () => {
      const venueData: CreateVenueRequest = {
        name: 'Venue to Delete',
        capacity: 30,
        equipment: [],
        availability: [],
        location: 'Delete Location',
        accessibility: []
      };

      const response = await request(app)
        .post('/api/venues')
        .send(venueData);

      venueId = response.body.data.id;
    });

    it('should delete venue successfully', async () => {
      const response = await request(app)
        .delete(`/api/venues/${venueId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Venue deleted successfully');

      // Verify venue is deleted
      await request(app)
        .get(`/api/venues/${venueId}`)
        .expect(404);
    });

    it('should return 404 for non-existent venue deletion', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/venues/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Venue not found');
    });
  });

  describe('GET /api/venues/search/capacity', () => {
    beforeEach(async () => {
      const venues = [
        { name: 'Small', capacity: 25, equipment: [], availability: [], location: 'A', accessibility: [] },
        { name: 'Medium', capacity: 75, equipment: [], availability: [], location: 'B', accessibility: [] },
        { name: 'Large', capacity: 150, equipment: [], availability: [], location: 'C', accessibility: [] }
      ];

      for (const venue of venues) {
        await request(app).post('/api/venues').send(venue);
      }
    });

    it('should find venues by capacity range', async () => {
      const response = await request(app)
        .get('/api/venues/search/capacity?min=50&max=100')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Medium');
    });

    it('should return validation error for invalid capacity parameters', async () => {
      const response = await request(app)
        .get('/api/venues/search/capacity?min=invalid&max=100')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Valid min and max capacity values are required');
    });
  });

  describe('GET /api/venues/search/equipment', () => {
    beforeEach(async () => {
      const venues = [
        { 
          name: 'Basic Room', 
          capacity: 30, 
          equipment: [Equipment.WHITEBOARD], 
          availability: [], 
          location: 'A', 
          accessibility: [] 
        },
        { 
          name: 'Tech Room', 
          capacity: 50, 
          equipment: [Equipment.PROJECTOR, Equipment.COMPUTER], 
          availability: [], 
          location: 'B', 
          accessibility: [] 
        }
      ];

      for (const venue of venues) {
        await request(app).post('/api/venues').send(venue);
      }
    });

    it('should find venues by equipment', async () => {
      const response = await request(app)
        .get('/api/venues/search/equipment?equipment=PROJECTOR')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Tech Room');
    });

    it('should return validation error when equipment parameter is missing', async () => {
      const response = await request(app)
        .get('/api/venues/search/equipment')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Equipment parameter is required');
    });
  });

  describe('GET /api/venues/search/available', () => {
    beforeEach(async () => {
      const venueData: CreateVenueRequest = {
        name: 'Available Room',
        capacity: 40,
        equipment: [],
        availability: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            startTime: '09:00',
            endTime: '17:00'
          },
          {
            dayOfWeek: DayOfWeek.TUESDAY,
            startTime: '10:00',
            endTime: '16:00'
          }
        ],
        location: 'Building C',
        accessibility: []
      };

      await request(app).post('/api/venues').send(venueData);
    });

    it('should find available venues at specific time', async () => {
      const response = await request(app)
        .get('/api/venues/search/available?dayOfWeek=MONDAY&startTime=10:00&endTime=12:00')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Available Room');
    });

    it('should return empty array when no venues are available', async () => {
      const response = await request(app)
        .get('/api/venues/search/available?dayOfWeek=WEDNESDAY&startTime=10:00&endTime=12:00')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return validation error for missing parameters', async () => {
      const response = await request(app)
        .get('/api/venues/search/available?dayOfWeek=MONDAY')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('dayOfWeek, startTime, and endTime are required');
    });
  });
});