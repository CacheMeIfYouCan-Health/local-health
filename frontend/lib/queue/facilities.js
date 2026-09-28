/**
 * Mock facility source. When the backend exists, replace getFacility() and
 * listFacilities() with fetch() calls. The shape returned here is the shape
 * every consumer expects — don't change it without changing the consumers.
 *
 * `coords` is included because the CLIENT needs it to compute the boolean
 * location-verified flag. It never travels with a report payload.
 */
const FACILITIES = {
  'clinic-001': {
    id: 'clinic-001',
    name: 'Soweto Community Clinic',
    address: '1234 Vilakazi St, Orlando West',
    coords: { latitude: -26.2374, longitude: 27.9047 },
  },
  'clinic-002': {
    id: 'clinic-002',
    name: 'Diepsloot Community Health Centre',
    address: '1 Civic Centre Rd, Diepsloot',
    coords: { latitude: -25.9337, longitude: 27.9993 },
  },
};

export async function getFacility(id) {
  return FACILITIES[id] ?? null;
}

export async function listFacilities() {
  return Object.values(FACILITIES);
}

export const DEFAULT_FACILITY_ID = 'clinic-001';