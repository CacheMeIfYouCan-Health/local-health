import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '@/components/screen';
import EmergencyButton from '@/components/emergency-button';
import FacilitiesStatus from '@/components/facilities-status';
import AccountRow from '@/components/account-row';
import { Card, MetaLabel, Touchable, Ionicons, SecondaryButton } from '@/components/ui';
import { colors, spacing, radius, touch } from '@/lib/theme';
import { list, update } from '@/lib/storage';
import { callNumber, loadAirtime } from '@/lib/dialer';
import { nearestEmergencyFacility, bestEmergencyNumber } from '@/lib/api';
import { formatDistance, facilityTypeLabel } from '@/lib/format';
import { useFacilities } from '@/features/facilities/store';

// National emergency numbers (South Africa). 112 works from any cellphone,
// even without airtime.
const NATIONAL = [
  { number: '10177', label: 'Ambulance & fire', icon: 'medkit' },
  { number: '112', label: 'Mobile emergency', icon: 'phone-portrait' },
];

export default function Emergency() {
  const router = useRouter();
  const facilitiesState = useFacilities();
  const facilities = facilitiesState.cache?.facilities ?? [];
  const [voucher, setVoucher] = useState(null);
  const [contact, setContact] = useState(null);

  // Re-read on-device data whenever the tab gains focus, so a voucher added
  // on the Airtime tab shows up here immediately.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const vouchers = await list('vouchers');
        setVoucher(vouchers.find((v) => !v.used) ?? null);
        try {
          const raw = await AsyncStorage.getItem('medical_profile');
          const p = raw ? JSON.parse(raw) : null;
          setContact(p?.emergencyPhone ? { name: p.emergencyName || 'Emergency contact', phone: p.emergencyPhone, rel: p.emergencyRelationship } : null);
        } catch {
          setContact(null);
        }
      })();
    }, []),
  );

  const facility = nearestEmergencyFacility(facilities);
  const target = facility
    ? { name: facility.name, number: bestEmergencyNumber(facility) }
    : { name: 'Ambulance (10177)', number: '10177' };

  const onEmergency = () => {
    if (!voucher) return callNumber(target.number);
    Alert.alert(
      'Emergency call',
      `Load your ${voucher.provider.toUpperCase()} airtime voucher first, or call ${target.name} now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call now', onPress: () => callNumber(target.number) },
        {
          text: 'Load airtime',
          onPress: async () => {
            await loadAirtime(voucher.provider, voucher.pin, target.number);
            // Shown when the user returns from the dialer.
            Alert.alert('Airtime loaded?', `When the airtime is loaded, call ${target.name}.`, [
              { text: 'Not yet', style: 'cancel' },
              {
                text: 'Call now',
                onPress: async () => {
                  await update('vouchers', voucher.id, { used: true });
                  setVoucher(null);
                  callNumber(target.number);
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <Screen title="Emergency" subtitle="Tap SOS to call the nearest emergency service. Your phone will ask you to confirm the call.">
      <EmergencyButton
        onPress={onEmergency}
        subtitle={facility ? `Calls ${target.name}` : 'Calls the national ambulance line 10177'}
      />

      <Card>
        <MetaLabel>Nearest emergency facility</MetaLabel>
        {facility ? (
          <Touchable
            onPress={() => callNumber(target.number)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${facility.name} on ${target.number}`}
            style={s.facRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.facName} numberOfLines={2}>{facility.name}</Text>
              <Text style={s.facMeta}>
                {facilityTypeLabel(facility.type)} · {formatDistance(facility.distanceKm)} away
              </Text>
              <Text style={s.facPhone}>{target.number}</Text>
            </View>
            <View style={[s.callIcon, { backgroundColor: colors.red600 }]}>
              <Ionicons name="call" size={20} color={colors.white} />
            </View>
          </Touchable>
        ) : (
          <View>
            <Text style={s.empty}>
              {facilitiesState.loading
                ? 'Looking for hospitals near you…'
                : 'No nearby hospital saved yet. SOS will call the national ambulance line until facilities are loaded.'}
            </Text>
            {!facilitiesState.loading && (
              <SecondaryButton icon="location-outline" onPress={() => router.navigate('/facilities')}>
                Find facilities near me
              </SecondaryButton>
            )}
          </View>
        )}
        <View style={{ marginTop: spacing.sm }}>
          <FacilitiesStatus state={facilitiesState} compact />
        </View>
      </Card>

      <Card>
        <MetaLabel>National emergency numbers</MetaLabel>
        <View style={s.nationalRow}>
          {NATIONAL.map((n) => (
            <Touchable
              key={n.number}
              onPress={() => callNumber(n.number)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${n.label}, ${n.number}`}
              style={s.national}
            >
              <Ionicons name={n.icon} size={20} color={colors.red700} />
              <Text style={s.nationalNumber}>{n.number}</Text>
              <Text style={s.nationalLabel}>{n.label}</Text>
            </Touchable>
          ))}
        </View>
      </Card>

      {contact && (
        <Card>
          <MetaLabel>Your emergency contact</MetaLabel>
          <Touchable onPress={() => callNumber(contact.phone)} accessibilityRole="button" style={s.facRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.facName}>{contact.name}{contact.rel ? ` (${contact.rel})` : ''}</Text>
              <Text style={s.facPhone}>{contact.phone}</Text>
            </View>
            <View style={[s.callIcon, { backgroundColor: colors.emerald600 }]}>
              <Ionicons name="call" size={20} color={colors.white} />
            </View>
          </Touchable>
        </Card>
      )}

      <Card>
        <MetaLabel>Airtime voucher</MetaLabel>
        {voucher ? (
          <Text style={s.body}>
            {voucher.provider.toUpperCase()} voucher{voucher.value && voucher.value !== '—' ? ` (R${voucher.value})` : ''} ready.
            SOS will offer to load it before calling.
          </Text>
        ) : (
          <View>
            <Text style={s.empty}>No unused voucher saved. Add one so you can load airtime in an emergency.</Text>
            <SecondaryButton icon="add" onPress={() => router.navigate('/vouchers')}>Add a voucher</SecondaryButton>
          </View>
        )}
      </Card>

      <AccountRow />
    </Screen>
  );
}

const s = StyleSheet.create({
  facRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, minHeight: touch,
  },
  facName: { fontSize: 17, fontWeight: '700', color: colors.text },
  facMeta: { fontSize: 14, color: colors.textSubtle, marginTop: 2 },
  facPhone: { fontSize: 16, color: colors.blue700, fontWeight: '700', marginTop: 4 },
  callIcon: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center' },
  nationalRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  national: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, minHeight: touch,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.red100, backgroundColor: colors.red50,
  },
  nationalNumber: { fontSize: 22, fontWeight: '800', color: colors.red700, marginTop: 2 },
  nationalLabel: { fontSize: 13, color: colors.red700, marginTop: 2 },
  empty: { fontSize: 15, color: colors.textSubtle, marginTop: spacing.sm, lineHeight: 21 },
  body: { fontSize: 15, color: colors.text, marginTop: spacing.sm, lineHeight: 21 },
});
