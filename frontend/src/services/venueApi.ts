import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/api';
import { Venue, CreateVenueRequest, UpdateVenueRequest } from '../types/entities';

export class VenueApi {
  private readonly basePath = '/venues';

  async getVenues(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Venue>> {
    return apiClient.getPaginated<Venue>(this.basePath, params);
  }

  async getVenue(id: string): Promise<ApiResponse<Venue>> {
    return apiClient.get<Venue>(`${this.basePath}/${id}`);
  }

  async createVenue(venue: CreateVenueRequest): Promise<ApiResponse<Venue>> {
    return apiClient.post<Venue>(this.basePath, venue);
  }

  async updateVenue(id: string, venue: UpdateVenueRequest): Promise<ApiResponse<Venue>> {
    return apiClient.put<Venue>(`${this.basePath}/${id}`, venue);
  }

  async deleteVenue(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async searchVenues(query: string): Promise<ApiResponse<Venue[]>> {
    return apiClient.get<Venue[]>(`${this.basePath}/search?q=${encodeURIComponent(query)}`);
  }

  async getVenueAvailability(id: string, startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${id}/availability?start=${startDate}&end=${endDate}`);
  }
}

export const venueApi = new VenueApi();