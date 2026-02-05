export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null; // meters, null if not available
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export async function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext || 
                            window.location.protocol === 'https:' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      reject({
        code: 0,
        message: 'Geolocation requires HTTPS. Please use HTTPS or access via localhost. You can enter coordinates manually.'
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || null,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let message = error.message;
        
        // Provide more helpful error messages
        if (error.code === 1) {
          message = 'Location permission denied. Please enable location access in your browser settings and try again.';
        } else if (error.code === 2) {
          message = 'Location unavailable. Please check your GPS settings and try again.';
        } else if (error.code === 3) {
          message = 'Location request timed out. Please try again.';
        }
        
        reject({
          code: error.code,
          message
        });
      },
      options
    );
  });
}

export function calculateUncertainty(accuracy: number | null | undefined): number | undefined {
  // Use GPS accuracy if available, otherwise return undefined
  if (accuracy && accuracy > 0) {
    return Math.round(accuracy);
  }
  return undefined;
}

