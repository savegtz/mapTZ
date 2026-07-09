export interface LocationPin {
  id: string;
  name: string;
  description: string; // custom instructions/directions (e.g. "Take the stairs, shop is next to the elevator")
  latitude: number;
  longitude: number;
  createdAt: number;
  imageUrl?: string; // custom visual reference style or photo description
  audioText?: string; // text used to seed the Gemini voice guide
  
  // Business Profile Fields
  isBusiness?: boolean;
  businessType?: string[]; // e.g. ["retail", "store", "service"]
  businessCategory?: string;
  serviceAreas?: string;
  phone?: string;
  website?: string;
  address?: {
    country: string;
    street: string;
    town: string;
    postcode: string;
  };
  businessHours?: {
    [day: string]: {
      closed: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };
  verified?: boolean;
}

export interface NavState {
  currentLat: number | null;
  currentLng: number | null;
  heading: number | null; // compass heading in degrees (0 = North, 90 = East, etc.)
  distance: number | null; // distance to target in meters
  bearing: number | null; // bearing to target in degrees (absolute)
  relativeAngle: number | null; // angle to target relative to heading (-180 to 180)
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}
