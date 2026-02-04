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
        reject({
          code: error.code,
          message: error.message
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

