import { QueryResultRow } from 'pg';
import { AbstractBaseRepository } from './baseRepository';
import { Venue, CreateVenueRequest, UpdateVenueRequest, VenueFilter } from '../models/venue';
import { Equipment, AccessibilityFeature, TimeSlot, DayOfWeek } from '../models/common';

interface VenueRow extends QueryResultRow {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  location: string;
  accessibility: string[];
  building?: string;
  floor?: number;
  room_number?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VenueAvailabilityRow extends QueryResultRow {
  id: string;
  venue_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export class VenueRepository extends AbstractBaseRepository<Venue> {
  protected tableName = 'venues';

  protected mapRowToEntity(row: VenueRow): Venue {
    const venue: Venue = {
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      equipment: row.equipment as Equipment[],
      availability: [], // Will be loaded separately
      location: row.location,
      accessibility: row.accessibility as AccessibilityFeature[],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    if (row.building !== null && row.building !== undefined) {
      venue.building = row.building;
    }
    if (row.floor !== null && row.floor !== undefined) {
      venue.floor = row.floor;
    }
    if (row.room_number !== null && row.room_number !== undefined) {
      venue.roomNumber = row.room_number;
    }
    if (row.description !== null && row.description !== undefined) {
      venue.description = row.description;
    }

    return venue;
  }

  protected getInsertFields(): string[] {
    return [
      'name', 'capacity', 'equipment', 'location', 'accessibility',
      'building', 'floor', 'room_number', 'description'
    ];
  }

  protected getUpdateFields(): string[] {
    return [
      'name', 'capacity', 'equipment', 'location', 'accessibility',
      'building', 'floor', 'room_number', 'description'
    ];
  }

  override async findById(id: string): Promise<Venue | null> {
    const venue = await super.findById(id);
    if (!venue) {
      return null;
    }

    // Load availability
    venue.availability = await this.getVenueAvailability(id);
    return venue;
  }

  override async findAll(filters: VenueFilter = {}): Promise<Venue[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Handle capacity filters
    if (filters.minCapacity !== undefined) {
      query += ` AND capacity >= $${paramIndex}`;
      params.push(filters.minCapacity);
      paramIndex++;
    }

    if (filters.maxCapacity !== undefined) {
      query += ` AND capacity <= $${paramIndex}`;
      params.push(filters.maxCapacity);
      paramIndex++;
    }

    // Handle equipment filter
    if (filters.requiredEquipment && filters.requiredEquipment.length > 0) {
      query += ` AND equipment @> $${paramIndex}`;
      params.push(filters.requiredEquipment);
      paramIndex++;
    }

    // Handle accessibility filter
    if (filters.requiredAccessibility && filters.requiredAccessibility.length > 0) {
      query += ` AND accessibility @> $${paramIndex}`;
      params.push(filters.requiredAccessibility);
      paramIndex++;
    }

    // Handle building filter
    if (filters.building) {
      query += ` AND building = $${paramIndex}`;
      params.push(filters.building);
      paramIndex++;
    }

    // Handle floor filter
    if (filters.floor !== undefined) {
      query += ` AND floor = $${paramIndex}`;
      params.push(filters.floor);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const result = await this.db.query<VenueRow>(query, params);
    const venues = result.rows.map(row => this.mapRowToEntity(row));

    // Load availability for all venues
    for (const venue of venues) {
      venue.availability = await this.getVenueAvailability(venue.id);
    }

    // Filter by availability if specified
    if (filters.availableAt) {
      return venues.filter(venue => 
        this.isVenueAvailableAt(venue, filters.availableAt!)
      );
    }

    return venues;
  }

  override async create(data: CreateVenueRequest): Promise<Venue> {
    return await this.db.transaction(async (trx) => {
      // Create venue
      const venueResult = await trx.query<VenueRow>(
        `INSERT INTO venues (name, capacity, equipment, location, accessibility, building, floor, room_number, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          data.name,
          data.capacity,
          data.equipment,
          data.location,
          data.accessibility,
          data.building,
          data.floor,
          data.roomNumber,
          data.description
        ]
      );

      const venue = this.mapRowToEntity(venueResult.rows[0]!);

      // Create availability records
      if (data.availability && data.availability.length > 0) {
        await this.setVenueAvailability(venue.id, data.availability, trx);
        venue.availability = data.availability;
      }

      return venue;
    });
  }

  override async update(id: string, data: UpdateVenueRequest): Promise<Venue | null> {
    return await this.db.transaction(async (trx) => {
      // Update venue
      const updateData = { ...data };
      delete (updateData as any).availability; // Handle availability separately

      const venue = await super.update(id, updateData);
      if (!venue) {
        return null;
      }

      // Update availability if provided
      if (data.availability !== undefined) {
        await this.setVenueAvailability(id, data.availability, trx);
        venue.availability = data.availability;
      } else {
        venue.availability = await this.getVenueAvailability(id);
      }

      return venue;
    });
  }

  async findByCapacityRange(minCapacity: number, maxCapacity: number): Promise<Venue[]> {
    return this.findAll({ minCapacity, maxCapacity });
  }

  async findByEquipment(equipment: Equipment[]): Promise<Venue[]> {
    return this.findAll({ requiredEquipment: equipment });
  }

  async findAvailableAt(timeSlot: TimeSlot): Promise<Venue[]> {
    return this.findAll({ availableAt: timeSlot });
  }

  private async getVenueAvailability(venueId: string): Promise<TimeSlot[]> {
    const result = await this.db.query<VenueAvailabilityRow>(
      'SELECT * FROM venue_availability WHERE venue_id = $1 ORDER BY day_of_week, start_time',
      [venueId]
    );

    return result.rows.map(row => ({
      startTime: row.start_time,
      endTime: row.end_time,
      dayOfWeek: row.day_of_week as DayOfWeek
    }));
  }

  private async setVenueAvailability(
    venueId: string, 
    availability: TimeSlot[], 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Delete existing availability
    await db.query('DELETE FROM venue_availability WHERE venue_id = $1', [venueId]);

    // Insert new availability
    if (availability.length > 0) {
      const values = availability.map((_, index) => {
        const baseIndex = index * 4;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
      }).join(', ');

      const params = availability.flatMap(slot => [
        venueId,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime
      ]);

      await db.query(
        `INSERT INTO venue_availability (venue_id, day_of_week, start_time, end_time) VALUES ${values}`,
        params
      );
    }
  }

  private isVenueAvailableAt(venue: Venue, timeSlot: TimeSlot): boolean {
    return venue.availability.some(slot => 
      slot.dayOfWeek === timeSlot.dayOfWeek &&
      slot.startTime <= timeSlot.startTime &&
      slot.endTime >= timeSlot.endTime
    );
  }
}

// Export singleton instance
export const venueRepository = new VenueRepository();