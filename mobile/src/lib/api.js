import { list, save } from './storage';

// TODO: replace with your real backend base URL
const BASE_URL = 'https://your-web-app.com';

const FACILITIES_KEY = 'facilities';

/**
 * Facility shape (mock):
 * {
 *   id: string,
 *   name: string,
 *   phone: string,
 *   address: string,
 *   hasAmbulance: boolean,
 *   lat: number,
 *   lng: number,
 *   type: 'clinic' | 'hospital' | 'health_centre'
 * }
 */

const MOCK_FACILITIES = [
  {
    id: 'f1',
    name: 'Charlotte Maxeke Hospital',
    phone: '0114884000',
    address: 'Parktown, Johannesburg',
    hasAmbulance: true,
    lat: -26.1775,
    lng: 28.0397,
    type: 'hospital',
  },
  {
    id: 'f2',
    name: 'Chris Hani Baragwanath',
    phone: '0119338000',
    address: 'Soweto, Johannesburg',
    hasAmbulance: true,
    lat: -26.2606,
    lng: 27.9436,
    type: 'hospital',
  },
  {
    id: 'f3',
    name: 'Hillbrow Clinic',
    phone: '0114803300',
    address: 'Hillbrow, Johannesburg',
    hasAmbulance: false,
    lat: -26.2013,
    lng: 28.0495,
    type: 'clinic',
  },
];

export async function fetchNearbyFacilities({ lat, lng }) {
  // MOCK: returns fixtures after a short delay.
  // Swap for real fetch when backend is ready:
  //
  // const res = await fetch(`${BASE_URL}/api/facilities/nearby?lat=${lat}&lng=${lng}`);
  // if (!res.ok) throw new Error(`Facilities fetch failed: ${res.status}`);
  // const data = await res.json();

  await new Promise((r) => setTimeout(r, 400));
  const data = MOCK_FACILITIES;

  await save(FACILITIES_KEY, data);
  return data;
}

export async function getCachedFacilities() {
  return list(FACILITIES_KEY);
}

export function filterAmbulance(facilities) {
  return facilities.filter((f) => f.hasAmbulance);
}