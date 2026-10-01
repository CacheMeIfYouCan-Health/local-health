import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, EmptyState, Touchable, Ionicons, PrimaryButton } from '@/components/ui';
import FacilitiesStatus from '@/components/facilities-status';
import { colors, spacing, radius, touch, font, shadow } from '@/lib/theme';
import { sortByDistance, isEmergencyCapable } from '@/lib/api';
import { FACILITY_TYPES, formatDistance, facilityTypeLabel } from '@/lib/format';
import { callNumber } from '@/lib/dialer';
import { useFacilities, refreshFacilities } from '@/features/facilities/store';

const FILTERS = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'hospital', label: FACILITY_TYPES.hospital.plural, icon: 'medkit-outline' },
  { key: 'clinic', label: FACILITY_TYPES.clinic.plural, icon: 'medical-outline' },
  { key: 'pharmacy', label: FACILITY_TYPES.pharmacy.plural, icon: 'bandage-outline' },
  { key: 'practitioner', label: FACILITY_TYPES.practitioner.plural, icon: 'person-outline' },
];

export default function Nearby() {
  const state = useFacilities();
  const [filter, setFilter] = useState('all');

  const all = useMemo(() => sortByDistance(state.cache?.facilities ?? []), [state.cache]);
  const counts = useMemo(() => {
    const c = { all: all.length };
    for (const f of all) c[f.type] = (c[f.type] || 0) + 1;
    return c;
  }, [all]);
  const items = filter === 'all' ? all : all.filter((f) => f.type === filter);

  const header = (
    <View>
      <Text style={s.title} accessibilityRole="header">Nearby</Text>
      <Text style={s.sub}>Clinics, hospitals and pharmacies near you, sorted by distance. Tap the phone to call.</Text>

      <FacilitiesStatus state={state} />

      {all.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          style={s.chipScroll}
        >
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key]).map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              icon={f.icon}
              count={counts[f.key] || 0}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const empty = state.loading || !state.hydrated ? null : state.cache ? (
    <EmptyState
      icon="search-outline"
      title="Nothing found nearby"
      message={`No ${filter === 'all' ? 'facilities' : FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} within ${state.cache.radiusKm ?? 25} km of where you were. Tap Update to search again from your current location.`}
    />
  ) : !state.error ? (
    <EmptyState
      icon="location-outline"
      title="No facilities saved yet"
      message="We'll use your location once to find nearby facilities and save them for offline use."
    >
      <PrimaryButton icon="locate" onPress={() => refreshFacilities()} style={{ alignSelf: 'stretch' }}>
        Find facilities near me
      </PrimaryButton>
    </EmptyState>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={items}
        keyExtractor={(f) => String(f.id)}
        renderItem={({ item }) => <FacilityRow facility={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={s.container}
        initialNumToRender={15}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

function FacilityRow({ facility: f }) {
  const number = f.phone || f.emergencyPhone;
  const emergency = isEmergencyCapable(f);
  const typeIcon = FACILITY_TYPES[f.type]?.icon ?? 'business';

  return (
    <View style={s.row}>
      <View style={[s.typeIcon, emergency && { backgroundColor: colors.red50 }]}>
        <Ionicons name={typeIcon} size={20} color={emergency ? colors.red700 : colors.emerald700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={2}>{f.name}</Text>
        <Text style={s.meta} numberOfLines={1}>
          {facilityTypeLabel(f.type)} · {formatDistance(f.distanceKm)}
          {f.queue?.avgWaitMinutes != null ? ` · ~${Math.round(f.queue.avgWaitMinutes)} min wait` : ''}
        </Text>
        {f.address ? <Text style={s.address} numberOfLines={1}>{f.address}</Text> : null}
        {f.emergencyPhone && f.emergencyPhone !== f.phone ? (
          <Touchable onPress={() => callNumber(f.emergencyPhone)} style={s.emergencyLink} hitSlop={8} accessibilityRole="button">
            <Ionicons name="alert-circle" size={15} color={colors.red700} />
            <Text style={s.emergencyText}>Emergency: {f.emergencyPhone}</Text>
          </Touchable>
        ) : null}
      </View>
      {number ? (
        <Touchable
          onPress={() => callNumber(number)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${f.name} on ${number}`}
          rippleColor="rgba(255,255,255,0.3)"
          style={s.callBtn}
        >
          <Ionicons name="call" size={20} color={colors.white} />
        </Touchable>
      ) : (
        <Text style={s.noPhone}>No phone</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg, lineHeight: 21 },
  chipScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.md },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
    ...shadow(1),
  },
  typeIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.emerald50,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  address: { fontSize: 13, color: colors.textSubtle, marginTop: 2 },
  emergencyLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, minHeight: 32, alignSelf: 'flex-start', borderRadius: radius.sm },
  emergencyText: { fontSize: 14, fontWeight: '700', color: colors.red700 },
  callBtn: {
    width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.emerald600,
    alignItems: 'center', justifyContent: 'center',
  },
  noPhone: { fontSize: 12, color: colors.gray400, width: touch, textAlign: 'center' },
});
