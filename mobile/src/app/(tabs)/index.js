import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, MetaLabel, Row } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { list } from '@/lib/storage';
import { callNumber, loadAirtime } from '@/lib/dialer';

export default function Home() {
  const [ambulance, setAmbulance] = useState(null);
  const [voucher, setVoucher] = useState(null);

  useEffect(() => {
    (async () => {
      const facilities = await list('facilities');
      setAmbulance(facilities.find((f) => f.hasAmbulance) ?? null);
      const vouchers = await list('vouchers');
      setVoucher(vouchers.find((v) => !v.used) ?? null);
    })();
  }, []);

  const onEmergency = async () => {
    if (!ambulance) return Alert.alert('No facility', 'Open Nearby to load facilities first.');
    if (!voucher)   return callNumber(ambulance.phone); // just dial if no voucher
    Alert.alert(
      'Emergency',
      `Load airtime with ${voucher.provider.toUpperCase()} then call ${ambulance.name}?`,
      [
        { text: 'Cancel' },
        {
          text: 'Load & Call',
          onPress: async () => {
            await loadAirtime(voucher.provider, voucher.pin, ambulance.phone);
          },
        },
        { text: 'Call only', onPress: () => callNumber(ambulance.phone) },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Text style={s.title}>Emergency</Text>
        <Text style={s.sub}>Loads airtime and opens the dialer.</Text>

        <Pressable
          onPress={onEmergency}
          style={({ pressed }) => [s.sos, pressed && { backgroundColor: colors.red700 }]}
        >
          <Text style={s.sosText}>SOS</Text>
          <Text style={s.sosSub}>Tap to call ambulance</Text>
        </Pressable>

        <Card>
          <MetaLabel>Nearest ambulance</MetaLabel>
          {ambulance ? (
            <View style={{ marginTop: spacing.md }}>
              <Row label="Facility" value={ambulance.name} />
              <Row label="Phone" value={ambulance.phone} accent />
            </View>
          ) : (
            <Text style={s.empty}>No facility cached. Open Nearby.</Text>
          )}
        </Card>

        <Card>
          <MetaLabel>Airtime voucher</MetaLabel>
          {voucher ? (
            <View style={{ marginTop: spacing.md }}>
              <Row label="Provider" value={voucher.provider.toUpperCase()} />
              <Row label="Value" value={`R${voucher.value}`} />
            </View>
          ) : (
            <Text style={s.empty}>No voucher saved.</Text>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.gray900 },
  sub: { fontSize: 13, color: colors.gray500, marginBottom: spacing.md },
  sos: {
    backgroundColor: colors.red600,
    borderRadius: radius.xl,
    paddingVertical: 36,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sosText: { color: colors.white, fontSize: 44, fontWeight: '800', letterSpacing: 2 },
  sosSub: { color: colors.white, fontSize: 13, marginTop: 4, opacity: 0.9 },
  empty: { fontSize: 14, color: colors.gray500, marginTop: spacing.md },
});