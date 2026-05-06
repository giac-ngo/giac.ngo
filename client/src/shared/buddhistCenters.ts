// client/src/shared/buddhistCenters.ts
// Shared data and types for Buddhist centers / temples

export interface BuddhistCenter {
  id: string;
  name: string;
  slug?: string;
  location?: string;
  country?: string;
  tradition?: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  image?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  lat?: number;
  lng?: number;
  isActive?: boolean;
  type?: string;
  status?: 'open' | 'closed' | 'retreat' | 'by-appointment';
  members?: number;
  rating?: number;
  accentColor?: string;
  rank?: number;
}

export const buddhistCenters: BuddhistCenter[] = [];
