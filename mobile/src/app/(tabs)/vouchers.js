import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SecondaryButton, MetaLabel, Row } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { list, add, update } from '@/lib/storage';

const KEY = 'vouchers';

export default function Vouchers() {
  const [items, setItems] = useState([]);
  const [provider, setProvider] = useState('');
  const [pin, setPin] = useState('');
  const [value, setValue] = useState('');

  const refresh = async () => setItems(await list(KEY));
  useEffect(() => { refresh(); }, []);

  const onAdd = async () => {
    if (!provider.trim() || !pin.trim()) return;
    const next = await add(KEY, {
      provider: provider.toLowerCase().trim(),
      pin: pin.trim(),
      value: value.trim() || '—',
      used: false,
    });
    setItems(next);
    setProvider(''); setPin(''); setValue('');
  };

  const markUsed = async (id) => {
    const next = await update(KEY, id, { used: true });
    setItems(next);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>Airtime vouchers</Text>
        <Text style={s.sub}>Stored only on this device.</Text>

        <Card>
          <MetaLabel>New voucher</MetaLabel>
          <TextInput placeholder="Provider (mtn, vodacom…)" value={provider} onChangeText={setProvider}
            style={s.input} placeholderTextColor={colors.gray400} />
          <TextInput placeholder="PIN" value={pin} onChangeText={setPin}
            style={s.input} placeholderTextColor={colors.gray400} keyboardType="number-pad" />
          <TextInput placeholder="Value (e.g. 10)" value={value} onChangeText={setValue}
            style={s.input} placeholderTextColor={colors.gray400} keyboardType="numeric" />
          <PrimaryButton onPress={onAdd}>Save voucher</PrimaryButton>
        </Card>

        {items.map((it) => (
          <Card key={it.id}>
            <Text style={[s.itemTitle, it.used && { color: colors.gray400 }]}>
              {it.provider.toUpperCase()} — R{it.value} {it.used ? '(used)' : ''}
            </Text>
            <Row label="PIN" value={it.pin} accent />
            {!it.used && (
              <SecondaryButton onPress={() => markUsed(it.id)}>Mark as used</SecondaryButton>
            )}
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
  input: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.md, fontSize: 15, color: colors.gray900,
    backgroundColor: colors.white,
  },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900, marginBottom: spacing.sm },
});