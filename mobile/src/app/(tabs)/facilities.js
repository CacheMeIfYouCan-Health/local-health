import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, MetaLabel, Row } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { getCachedFacilities, fetchNearbyFacilities, filterAmbulance } from '@/lib/api';
import { callNumber } from '@/lib/dialer';

export default function Facilities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCached = async () => setItems(await getCachedFacilities());

  useEffect(() => { loadCached(); }, []);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      // TODO: replace with real coordinates or a way to get them
      const data = await fetchNearbyFacilities({ lat: -26.2041, lng: 28.0473 });
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ambulance = filterAmbulance(items);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>Nearby facilities</Text>
        <Text style={s.sub}>Cached for offline use.</Text>

        <PrimaryButton onPress={refresh} busy={loading}>
          {loading ? 'Refreshing…' : 'Refresh from server'}
        </PrimaryButton>

        {error && <Text style={s.error}>{error}</Text>}

        {ambulance.length > 0 && (
          <Card>
            <MetaLabel>Ambulance services</MetaLabel>
            {ambulance.map((f) => (
              <Pressable key={f.id} onPress={() => callNumber(f.phone)} style={s.row}>
                <Text style={s.facName}>{f.name}</Text>
                <Text style={s.facPhone}>{f.phone}</Text>
              </Pressable>
            ))}
          </Card>
        )}

        {items.length === 0 && !loading && (
          <Text style={s.empty}>No facilities cached. Tap refresh.</Text>
        )}

        {items.filter((f) => !f.hasAmbulance).map((f) => (
          <Card key={f.id}>
            <Text style={s.facName}>{f.name}</Text>
            <Row label="Phone" value={f.phone} accent />
            <Row label="Address" value={f.address || '—'} />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { padding: spacing.xl, paddingBottom: 96 },
  title: { fontSize: 22, fontWeight: '700', color: colors.gray900 },
  sub: { fontSize: 13, color: colors.gray500, marginBottom: spacing.lg },
  error: { color: colors.red600, marginTop: spacing.md, fontSize: 13 },
  empty: { color: colors.gray500, textAlign: 'center', marginTop: spacing.xxl },
  row: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray200 },
  facName: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  facPhone: { fontSize: 14, color: colors.blue700 || '#1d4ed8', fontWeight: '600', marginTop: 2 },
});