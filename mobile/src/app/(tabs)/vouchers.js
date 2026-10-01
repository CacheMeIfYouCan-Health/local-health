import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Screen from '@/components/screen';
import { Card, PrimaryButton, SecondaryButton, MetaLabel, Row, Field, Chip, EmptyState } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { list, add, update, remove } from '@/lib/storage';
import { buildUssd, loadAirtime } from '@/lib/dialer';

const KEY = 'vouchers';

// Keys match USSD_TEMPLATES in lib/dialer.js.
const PROVIDERS = [
  { key: 'vodacom', label: 'Vodacom' },
  { key: 'mtn', label: 'MTN' },
  { key: 'cellc', label: 'Cell C' },
  { key: 'telkom', label: 'Telkom' },
];
const providerLabel = (key) => PROVIDERS.find((p) => p.key === key)?.label ?? String(key).toUpperCase();

export default function Vouchers() {
  const [items, setItems] = useState([]);
  const [provider, setProvider] = useState('');
  const [pin, setPin] = useState('');
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState({});

  useFocusEffect(useCallback(() => { list(KEY).then(setItems); }, []));

  const onAdd = async () => {
    const errs = {};
    if (!provider) errs.provider = 'Choose your network.';
    const cleanPin = pin.replace(/\s+/g, '');
    if (!/^\d{8,24}$/.test(cleanPin)) errs.pin = 'Enter the PIN printed on the voucher (digits only).';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const next = await add(KEY, {
      provider,
      pin: cleanPin,
      value: value.trim() || '—',
      used: false,
    });
    setItems(next);
    setProvider(''); setPin(''); setValue('');
  };

  const markUsed = async (id) => setItems(await update(KEY, id, { used: true }));

  const onDelete = (it) => {
    Alert.alert('Delete voucher?', 'This removes the PIN from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setItems(await remove(KEY, it.id)) },
    ]);
  };

  return (
    <Screen
      keyboard
      title="Airtime"
      subtitle="Save an airtime voucher so SOS can load it before calling for help. Stored only on this phone."
    >
      <Card>
        <MetaLabel>New voucher</MetaLabel>
        <Text style={s.label}>Network</Text>
        <View style={s.chipWrap}>
          {PROVIDERS.map((p) => (
            <Chip
              key={p.key}
              label={p.label}
              selected={provider === p.key}
              onPress={() => { setProvider(p.key); setErrors((e) => ({ ...e, provider: null })); }}
            />
          ))}
        </View>
        {errors.provider ? <Text style={s.error}>{errors.provider}</Text> : null}

        <Field
          label="Voucher PIN"
          placeholder="Digits from the voucher"
          value={pin}
          onChangeText={(v) => { setPin(v); if (errors.pin) setErrors((e) => ({ ...e, pin: null })); }}
          keyboardType="number-pad"
          autoComplete="off"
          error={errors.pin}
        />
        <Field
          label="Value in Rand (optional)"
          placeholder="e.g. 10"
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          maxLength={5}
        />
        <PrimaryButton onPress={onAdd} icon="save-outline">Save voucher</PrimaryButton>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title="No vouchers saved"
          message="Buy an airtime voucher at any shop and save it here, so you can top up in an emergency without leaving the app."
        />
      ) : (
        <>
          <MetaLabel style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>Your vouchers</MetaLabel>
          {items.map((it) => (
            <Card key={it.id} style={it.used && { opacity: 0.7 }}>
              <Text style={[s.itemTitle, it.used && { color: colors.gray500 }]}>
                {providerLabel(it.provider)}{it.value && it.value !== '—' ? ` · R${it.value}` : ''}{it.used ? ' (used)' : ''}
              </Text>
              <Row label="PIN" value={it.pin} accent={!it.used} />
              {buildUssd(it.provider, it.pin) ? <Row label="Load code" value={buildUssd(it.provider, it.pin)} /> : null}
              {!it.used && (
                <>
                  <SecondaryButton icon="flash-outline" onPress={() => loadAirtime(it.provider, it.pin)}>Load now</SecondaryButton>
                  <SecondaryButton icon="checkmark" onPress={() => markUsed(it.id)}>Mark as used</SecondaryButton>
                </>
              )}
              <SecondaryButton icon="trash-outline" tone="danger" onPress={() => onDelete(it)}>Delete</SecondaryButton>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginTop: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  error: { fontSize: 13, color: colors.red600, marginTop: 4 },
  itemTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
});
