/**
 * Geocode an address to lat/lng using Google Maps Geocoding API.
 * Returns null when GOOGLE_MAPS_API_KEY is not set (dev mode).
 */

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * @param {string} address - Street address
 * @param {string} [city] - City name
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
async function geocodeAddress(address, city) {
  if (!API_KEY) return null;

  const query = city ? `${address}, ${city}` : address;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }

    console.warn(`[GEOCODE] No results for "${query}": ${data.status}`);
    return null;
  } catch (err) {
    console.error('[GEOCODE] Error:', err.message);
    return null;
  }
}

module.exports = { geocodeAddress };
