/**
 * parseGoogleMapsUrl.js
 *
 * Extracts numeric latitude and longitude coordinates from coordinate-bearing
 * Google Maps location links and URLs.
 *
 * Supported formats:
 * - @lat,lng (e.g. https://www.google.com/maps/@12.9715987,77.5945627,17z)
 * - place/.../@lat,lng (e.g. https://www.google.com/maps/place/Indiranagar/@12.9784,77.6408,15z/...)
 * - query/search params (e.g. ?q=12.9716,77.5946 or ?ll=12.9716,77.5946 or ?query=12.9716,77.5946)
 * - data params with !3dlat!4dlng (e.g. ...!3d12.9715987!4d77.5945627)
 * - place/lat,lng or loc:lat,lng (e.g. /place/12.9716+77.5946 or /loc:12.9716,77.5946)
 */

export function parseGoogleMapsUrl(input) {
  if (!input || typeof input !== 'string') {
    return {
      success: false,
      error: 'Please enter a valid Google Maps location link.',
    };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Please enter a valid Google Maps location link.',
    };
  }

  let foundLat = null;
  let foundLng = null;

  // 1. Try matching @lat,lng (e.g., /@12.9715987,77.5945627)
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    foundLat = parseFloat(atMatch[1]);
    foundLng = parseFloat(atMatch[2]);
  }

  // 2. Try matching data protobuf !3dlat!4dlng (e.g., !3d12.9715987!4d77.5945627)
  if (foundLat === null) {
    const dataMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      foundLat = parseFloat(dataMatch[1]);
      foundLng = parseFloat(dataMatch[2]);
    }
  }

  // 3. Try matching query parameters: q=lat,lng, ll=lat,lng, query=lat,lng, center=lat,lng
  if (foundLat === null) {
    const queryMatch = trimmed.match(/[?&](?:q|query|ll|center|saddr|daddr)=(-?\d+\.\d+)[,+](-?\d+\.\d+)/i);
    if (queryMatch) {
      foundLat = parseFloat(queryMatch[1]);
      foundLng = parseFloat(queryMatch[2]);
    }
  }

  // 4. Try matching place/lat,lng or loc:lat,lng
  if (foundLat === null) {
    const locMatch = trimmed.match(/(?:loc:|place\/)(-?\d+\.\d+)[,+](-?\d+\.\d+)/i);
    if (locMatch) {
      foundLat = parseFloat(locMatch[1]);
      foundLng = parseFloat(locMatch[2]);
    }
  }

  // 5. Try plain coordinates string pasted directly: e.g. "12.9716, 77.5946" or "12.9716,77.5946"
  if (foundLat === null) {
    const rawCoordsMatch = trimmed.match(/^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/);
    if (rawCoordsMatch) {
      foundLat = parseFloat(rawCoordsMatch[1]);
      foundLng = parseFloat(rawCoordsMatch[2]);
    }
  }

  // Validate geographic ranges
  if (
    foundLat !== null &&
    foundLng !== null &&
    !isNaN(foundLat) &&
    !isNaN(foundLng) &&
    foundLat >= -90 &&
    foundLat <= 90 &&
    foundLng >= -180 &&
    foundLng <= 180
  ) {
    return {
      success: true,
      lat: Number(foundLat.toFixed(6)),
      lng: Number(foundLng.toFixed(6)),
    };
  }

  return {
    success: false,
    error:
      'Could not resolve coordinates from this link. The link does not contain direct numeric coordinate parameters. Please enter latitude and longitude manually or copy a link with coordinates (e.g. https://www.google.com/maps/@12.9716,77.5946,...).',
  };
}

