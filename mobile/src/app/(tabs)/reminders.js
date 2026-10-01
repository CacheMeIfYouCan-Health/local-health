import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Screen from '@/components/screen';
import {
  Card, PrimaryButton, SecondaryButton, MetaLabel, Row, Field, Chip, EmptyState, Notice, Touchable, Ionicons,
} from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { list, add, remove } from '@/lib/storage';
import { parseTime } from '@/lib/format';
import { requestPermission, scheduleReminder, cancelReminder } from '@/lib/notifications';

const KEY = 'reminders';
const PRESETS = ['07:00', '08:00', '12:00', '13:00', '18:00', '20:00', '22:00'];

export default function Reminders() {
  const [items, setItems] = useState([]);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState([]);
  const [timeInput, setTimeInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notifWarning, setNotifWarning] = useState(false);
  const dosageRef = useRef(null);
  const timeRef = useRef(null);

  useEffect(() => { list(KEY).then(setItems); }, []);

  const sortTimes = (arr) => [...new Set(arr)].sort();

  const toggleTime = (t) => {
    setErrors((e) => ({ ...e, times: null }));
    setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : sortTimes([...prev, t])));
  };

  const addTypedTime = () => {
    if (!timeInput.trim()) return;
    const t = parseTime(timeInput);
    if (!t) {
      setErrors((e) => ({ ...e, time: 'Use 24-hour time like 08:00 or 20:30.' }));
      return;
    }
    setErrors((e) => ({ ...e, time: null, times: null }));
    setTimes((prev) => sortTimes([...prev, t]));
    setTimeInput('');
  };

  const onAdd = async () => {
    const errs = {};
    if (!medName.trim()) errs.medName = 'Enter the medication name.';
    // Include a valid time that was typed but not yet added.
    let finalTimes = times;
    if (timeInput.trim()) {
      const t = parseTime(timeInput);
      if (t) finalTimes = sortTimes([...times, t]);
      else errs.time = 'Use 24-hour time like 08:00 or 20:30.';
    }
    if (finalTimes.length === 0 && !errs.time) errs.times = 'Add at least one time.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const granted = await requestPermission();
      setNotifWarning(!granted);
      const id = `${Date.now()}`;
      const reminder = { id, medName: medName.trim(), dosage: dosage.trim(), times: finalTimes };
      const notificationIds = await scheduleReminder(reminder);
      setItems(await add(KEY, { ...reminder, notificationIds }));
      setMedName(''); setDosage(''); setTimes([]); setTimeInput('');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (item) => {
    Alert.alert('Delete reminder?', `Stop reminding you about ${item.medName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(item.notificationIds);
          setItems(await remove(KEY, item.id));
        },
      },
    ]);
  };

  return (
    <Screen
      keyboard
      title="Reminders"
      subtitle="Get a daily notification when it's time to take your medication. Works offline."
    >
      <Card>
        <MetaLabel>New reminder</MetaLabel>
        <Field
          label="Medication"
          placeholder="e.g. Metformin"
          value={medName}
          onChangeText={(v) => { setMedName(v); if (errors.medName) setErrors((e) => ({ ...e, medName: null })); }}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => dosageRef.current?.focus()}
          error={errors.medName}
        />
        <Field
          ref={dosageRef}
          label="Dosage (optional)"
          placeholder="e.g. 500 mg, 1 tablet"
          value={dosage}
          onChangeText={setDosage}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => timeRef.current?.focus()}
        />

        <Text style={s.label}>Times each day</Text>
        <View style={s.chipWrap}>
          {PRESETS.map((t) => (
            <Chip key={t} label={t} selected={times.includes(t)} onPress={() => toggleTime(t)} />
          ))}
        </View>

        <View style={s.timeRow}>
          <View style={{ flex: 1 }}>
            <Field
              ref={timeRef}
              placeholder="Other time, e.g. 21:30"
              value={timeInput}
              onChangeText={(v) => { setTimeInput(v); if (errors.time) setErrors((e) => ({ ...e, time: null })); }}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              returnKeyType="done"
              onSubmitEditing={addTypedTime}
              error={errors.time}
            />
          </View>
          <SecondaryButton icon="add" onPress={addTypedTime} style={s.addTimeBtn}>Add</SecondaryButton>
        </View>

        {times.length > 0 ? (
          <View style={[s.chipWrap, { marginTop: spacing.md }]}>
            {times.map((t) => (
              <Touchable
                key={t}
                onPress={() => toggleTime(t)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${t}`}
                style={s.selectedTime}
              >
                <Ionicons name="alarm" size={15} color={colors.white} />
                <Text style={s.selectedTimeText}>{t}</Text>
                <Ionicons name="close" size={15} color={colors.white} />
              </Touchable>
            ))}
          </View>
        ) : (
          <Text style={[s.hint, errors.times && { color: colors.red600 }]}>
            {errors.times || 'Tap a time above or type your own.'}
          </Text>
        )}

        <PrimaryButton onPress={onAdd} busy={saving} icon="notifications-outline">Save reminder</PrimaryButton>
        {notifWarning && (
          <Notice tone="warning">
            Notifications are turned off for this app, so reminders will not alert you. Enable them in your phone settings.
          </Notice>
        )}
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon="alarm-outline"
          title="No reminders yet"
          message="Add your first medication above and we'll remind you every day at the times you choose."
        />
      ) : (
        <>
          <MetaLabel style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>Your reminders</MetaLabel>
          {items.map((it) => (
            <Card key={it.id}>
              <Text style={s.itemTitle}>{it.medName}</Text>
              <Row label="Dosage" value={it.dosage || '—'} />
              <Row label="Times" value={(it.times || []).join(', ')} />
              <SecondaryButton icon="trash-outline" tone="danger" onPress={() => onDelete(it)}>Delete</SecondaryButton>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginTop: spacing.lg },
  hint: { fontSize: 13, color: colors.textSubtle, marginTop: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addTimeBtn: { marginTop: spacing.md, minWidth: 88 },
  selectedTime: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40,
    paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.emerald600,
  },
  selectedTimeText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  itemTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
});
