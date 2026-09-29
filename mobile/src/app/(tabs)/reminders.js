import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SecondaryButton, MetaLabel, Row } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { list, add, remove } from '@/lib/storage';
import { requestPermission, scheduleReminder, cancelReminder } from '@/lib/notifications';

const KEY = 'reminders';

export default function Reminders() {
  const [items, setItems] = useState([]);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState('');

  const refresh = async () => setItems(await list(KEY));
  useEffect(() => {
    (async () => {
      await requestPermission();
      await refresh();
    })();
  }, []);

  const onAdd = async () => {
    if (!medName.trim() || !times.trim()) return;
    const parsed = times.split(',').map((t) => t.trim()).filter(Boolean);
    const reminder = { medName, dosage, times: parsed, notificationIds: [] };
    const ids = await scheduleReminder({ ...reminder, id: Date.now().toString() });
    const saved = await add(KEY, { ...reminder, notificationIds: ids });
    setItems(saved);
    setMedName(''); setDosage(''); setTimes('');
  };

  const onDelete = async (item) => {
    await cancelReminder(item.notificationIds);
    const next = await remove(KEY, item.id);
    setItems(next);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>Reminders</Text>
        <Text style={s.sub}>Scheduled locally — works offline.</Text>

        <Card>
          <MetaLabel>New reminder</MetaLabel>
          <TextInput placeholder="Medication name" value={medName} onChangeText={setMedName}
            style={s.input} placeholderTextColor={colors.gray400} />
          <TextInput placeholder="Dosage (optional)" value={dosage} onChangeText={setDosage}
            style={s.input} placeholderTextColor={colors.gray400} />
          <TextInput placeholder="Times, comma-separated (08:00, 20:00)" value={times}
            onChangeText={setTimes} style={s.input} placeholderTextColor={colors.gray400} />
          <PrimaryButton onPress={onAdd}>Save reminder</PrimaryButton>
        </Card>

        {items.map((it) => (
          <Card key={it.id}>
            <Text style={s.itemTitle}>{it.medName}</Text>
            <Row label="Dosage" value={it.dosage || '—'} />
            <Row label="Times" value={it.times.join(', ')} />
            <SecondaryButton onPress={() => onDelete(it)}>Delete</SecondaryButton>
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