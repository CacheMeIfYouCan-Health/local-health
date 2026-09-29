import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadItem, saveItem } from '@/lib/storage';

type Voucher = { id: string; label: string; code: string };

const STORAGE_KEY = 'vouchers';

export default function VouchersScreen() {
  const theme = useTheme();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    loadItem<Voucher[]>(STORAGE_KEY, []).then(setVouchers);
  }, []);

  const persist = async (next: Voucher[]) => {
    setVouchers(next);
    await saveItem(STORAGE_KEY, next);
  };

  const addVoucher = async () => {
    if (!label.trim() || !code.trim()) return;
    await persist([...vouchers, { id: Date.now().toString(), label: label.trim(), code: code.trim() }]);
    setLabel('');
    setCode('');
  };

  const removeVoucher = (id: string) => {
    Alert.alert('Delete voucher?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(vouchers.filter((v) => v.id !== id)) },
    ]);
  };

  const redeem = (v: Voucher) => {
    // *123*CODE# is a generic example — user can change per carrier.
    const ussd = `*123*${v.code}#`;
    Alert.alert(
      'Redeem voucher',
      `This will open your dialer with:\n\n${ussd}\n\nPress call to redeem.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open dialer', onPress: () => Linking.openURL(`tel:${encodeURIComponent(ussd)}`) },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">Airtime vouchers</ThemedText>
          <ThemedText type="small">
            Stored only on this device. Never sent anywhere.
          </ThemedText>

          <View style={styles.form}>
            <TextInput
              placeholder="Label (e.g. Vodacom R10)"
              value={label}
              onChangeText={setLabel}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
              placeholderTextColor={theme.text + '80'}
            />
            <TextInput
              placeholder="Voucher code"
              value={code}
              onChangeText={setCode}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
              placeholderTextColor={theme.text + '80'}
            />
            <Pressable onPress={addVoucher} style={styles.addButton}>
              <ThemedText type="smallBold" style={styles.addButtonText}>Add voucher</ThemedText>
            </Pressable>
          </View>

          {vouchers.map((v) => (
            <View
              key={v.id}
              style={[styles.card, { borderColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{v.label}</ThemedText>
              <ThemedText type="code">{v.code}</ThemedText>
              <View style={styles.actions}>
                <Pressable onPress={() => redeem(v)} style={styles.redeemButton}>
                  <ThemedText type="smallBold" style={styles.addButtonText}>Redeem</ThemedText>
                </Pressable>
                <Pressable onPress={() => removeVoucher(v.id)}>
                  <ThemedText type="small" style={{ color: '#d32f2f' }}>Delete</ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  form: { gap: Spacing.two, marginTop: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff' },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  redeemButton: {
    backgroundColor: '#388e3c',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});