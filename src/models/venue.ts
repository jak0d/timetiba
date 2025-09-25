import { BaseEntity, Equipment, AccessibilityFeature, TimeSlot } from './common';

export interface Venue extends BaseEntity {
  name: string;
  capacity: number;
  equipment: Equipment[];
  availability: TimeSlot[];
  location: string;
  accessibility: AccessibilityFeature[];
  building?: string;
  floor?: number;
  roomNumber?: string;
  description?: string;
}

export interface CreateVenueRequest {
  name: string;
  capacity: number;
  equipment: Equipment[];
  availability: TimeSlot[];
  location: string;
  accessibility: AccessibilityFeature[];
  building?: string;
  floor?: number;
  roomNumber?: string;
  description?: string;
}

export interface UpdateVenueRequest extends Partial<CreateVenueRequest> {
  id: string;
}

export interface VenueFilter {
  minCapacity?: number;
  maxCapacity?: number;
  requiredEquipment?: Equipment[];
  requiredAccessibility?: AccessibilityFeature[];
  building?: string;
  floor?: number;
  availableAt?: TimeSlot;
}