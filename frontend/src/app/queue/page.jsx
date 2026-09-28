import { notFound } from 'next/navigation';
import QueueScreen from '@components/queue/QueueScreen';
import { getFacility, DEFAULT_FACILITY_ID } from '@lib/queue/facilities';

export const metadata = {
  title: 'Queue status',
};

export default async function QueuePage({ searchParams }) {
  // Next 14: searchParams is sync; Next 15: it's a Promise. `await` is safe on both.
  const params = await searchParams;
  const facilityId = params?.facility ?? DEFAULT_FACILITY_ID;

  const facility = await getFacility(facilityId);
  if (!facility) notFound();

  return <QueueScreen facility={facility} />;
}