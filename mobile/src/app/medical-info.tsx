import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadItem, saveItem } from '@/lib/storage';

type MedicalEntry = { id: string; label: string; value: string };

const STORAGE_KEY = 'medical-info';

export default function MedicalInfoScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<MedicalEntry[]>([]);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    loadItem<MedicalEntry[]>(STORAGE_KEY, []).then(setEntries);
  }, []);

  const persist = async (next: MedicalEntry[]) => {
    setEntries(next);
    await saveItem(STORAGE_KEY, next);
  };

  const addEntry = async () => {
    if (!label.trim() || !value.trim()) return;
    const next = [
      ...entries,
      { id: Date.now().toString(), label: label.trim(), value: value.trim() },
    ];
    await persist(next);
    setLabel('');
    setValue('');
  };

  const removeEntry = async (id: string) => {
    await persist(entries.filter((e) => e.id !== id));
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">My medical info</ThemedText>
          <ThemedText type="small">
            Stored only on this device. Never sent anywhere.
          </ThemedText>

          <View style={styles.form}>
            <TextInput
              placeholder="Label (e.g. Allergies)"
              value={label}
              onChangeText={setLabel}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
              placeholderTextColor={theme.text + '80'}
            />
            <TextInput
              placeholder="Value (e.g. Penicillin)"
              value={value}
              onChangeText={setValue}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
              placeholderTextColor={theme.text + '80'}
            />
            <Pressable onPress={addEntry} style={styles.addButton}>
              <ThemedText type="smallBold" style={styles.addButtonText}>
                Add
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.table, { borderColor: theme.backgroundElement }]}>
            <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.cellLabel}>Label</ThemedText>
              <ThemedText type="smallBold" style={styles.cellValue}>Value</ThemedText>
              <View style={styles.cellAction} />
            </View>
            {entries.length === 0 && (
              <View style={styles.row}>
                <ThemedText type="small" style={{ flex: 1 }}>No entries yet.</ThemedText>
              </View>
            )}
            {entries.map((e) => (
              <View
                key={e.id}
                style={[styles.row, { borderBottomColor: theme.backgroundElement }]}>
                <ThemedText type="small" style={styles.cellLabel}>{e.label}</ThemedText>
                <ThemedText type="small" style={styles.cellValue}>{e.value}</ThemedText>
                <Pressable onPress={() => removeEntry(e.id)} style={styles.cellAction}>
                  <ThemedText type="small" style={{ color: '#d32f2f' }}>Delete</ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
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
  table: { borderWidth: 1, borderRadius: Spacing.two, marginTop: Spacing.three },
  row: { flexDirection: 'row', padding: Spacing.two, alignItems: 'center' },
  headerRow: { borderBottomWidth: 1 },
  cellLabel: { flex: 1 },
  cellValue: { flex: 1 },
  cellAction: { width: 60, alignItems: 'flex-end' },
});