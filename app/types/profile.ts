// types/profile.ts
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  base_location?: string;
  street_address?: string;
  default_delivery_address?: string;
  city?: string;
  coordinates: { latitude: number | null; longitude: number | null };
}

export interface CoordinatePayload {
  latitude: number;
  longitude: number;
}