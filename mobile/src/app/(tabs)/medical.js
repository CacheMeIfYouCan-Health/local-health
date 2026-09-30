import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SecondaryButton, MetaLabel } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'medical_profile';

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];
const GENDERS = ['Male','Female','Other'];
const COMMON_CONDITIONS = [
  'High Blood Pressure','Heart Disease','Diabetes','Asthma','Epilepsy',
  'HIV/AIDS','Cancer','Kidney Disease','Thyroid Disorder',
  'Depression / Anxiety','Arthritis',
];

const EMPTY = {
  fullName: '', dob: '', gender: '', bloodType: '',
  phone: '', email: '', address: '',
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
  medicalAidScheme: '', medicalAidNumber: '',
  allergies: [], medications: [],
  conditions: [],
  smoker: false, alcohol: false,
  notes: '',
};

export default function Medical() {
  const [profile, setProfile] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) setProfile({ ...EMPTY, ...JSON.parse(raw) });
      setLoaded(true);
    })();
  }, []);

  const update = (patch) => setProfile((p) => ({ ...p, ...patch }));

  const save = async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
    Alert.alert('Saved', 'Medical info stored on this device.');
  };

  const toggleCondition = (c) => {
    update({
      conditions: profile.conditions.includes(c)
        ? profile.conditions.filter((x) => x !== c)
        : [...profile.conditions, c],
    });
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Medical info</Text>
          <Text style={s.sub}>Stored only on this device.</Text>

          <Card>
            <MetaLabel>Personal</MetaLabel>
            <Field label="Full name" value={profile.fullName} onChangeText={(v) => update({ fullName: v })} />
            <Field label="Date of birth" value={profile.dob} onChangeText={(v) => update({ dob: v })} placeholder="YYYY-MM-DD" />
            <Segmented label="Gender" options={GENDERS} value={profile.gender} onSelect={(v) => update({ gender: v })} />
            <Segmented label="Blood type" options={BLOOD_TYPES} value={profile.bloodType} onSelect={(v) => update({ bloodType: v })} wrap />
          </Card>

          <Card>
            <MetaLabel>Contact</MetaLabel>
            <Field label="Phone" value={profile.phone} onChangeText={(v) => update({ phone: v })} keyboardType="phone-pad" />
            <Field label="Email" value={profile.email} onChangeText={(v) => update({ email: v })} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Address" value={profile.address} onChangeText={(v) => update({ address: v })} multiline />
          </Card>

          <Card>
            <MetaLabel>Emergency contact</MetaLabel>
            <Field label="Name" value={profile.emergencyName} onChangeText={(v) => update({ emergencyName: v })} />
            <Field label="Relationship" value={profile.emergencyRelationship} onChangeText={(v) => update({ emergencyRelationship: v })} />
            <Field label="Phone" value={profile.emergencyPhone} onChangeText={(v) => update({ emergencyPhone: v })} keyboardType="phone-pad" />
          </Card>

          <Card>
            <MetaLabel>Medical aid</MetaLabel>
            <Field label="Scheme" value={profile.medicalAidScheme} onChangeText={(v) => update({ medicalAidScheme: v })} />
            <Field label="Member number" value={profile.medicalAidNumber} onChangeText={(v) => update({ medicalAidNumber: v })} />
          </Card>

          <ListSection
            title="Allergies"
            items={profile.allergies}
            fields={['name', 'reaction']}
            placeholders={['Allergy', 'Reaction']}
            onChange={(allergies) => update({ allergies })}
          />

          <ListSection
            title="Medications"
            items={profile.medications}
            fields={['name', 'dose', 'frequency']}
            placeholders={['Medication', 'Dose', 'Frequency']}
            onChange={(medications) => update({ medications })}
          />

          <Card>
            <MetaLabel>Conditions</MetaLabel>
            <View style={s.chipWrap}>
              {COMMON_CONDITIONS.map((c) => {
                const on = profile.conditions.includes(c);
                return (
                  <Pressable key={c} onPress={() => toggleCondition(c)} style={[s.chip, on && s.chipOn]}>
                    <Text style={[s.chipText, on && s.chipTextOn]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card>
            <MetaLabel>Lifestyle</MetaLabel>
            <Toggle label="Smoker" value={profile.smoker} onToggle={(v) => update({ smoker: v })} />
            <Toggle label="Drinks alcohol" value={profile.alcohol} onToggle={(v) => update({ alcohol: v })} />
          </Card>

          <Card>
            <MetaLabel>Additional notes</MetaLabel>
            <Field value={profile.notes} onChangeText={(v) => update({ notes: v })} multiline height={100} />
          </Card>

          <PrimaryButton onPress={save}>Save</PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline, height, ...rest }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.gray400}
        style={[s.input, multiline && { height: height || 80, textAlignVertical: 'top' }]}
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

function Segmented({ label, options, value, onSelect, wrap }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.chipWrap}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable key={o} onPress={() => onSelect(o)} style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Toggle({ label, value, onToggle }) {
  return (
    <Pressable onPress={() => onToggle(!value)} style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <View style={[s.switch, value && s.switchOn]}>
        <View style={s.knob} />
      </View>
    </Pressable>
  );
}

function ListSection({ title, items, fields, placeholders, onChange }) {
  const add = () => onChange([...items, Object.fromEntries(fields.map((f) => [f, '']))]);
  const updateItem = (i, field, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: v } : it)));
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <Card>
      <MetaLabel>{title}</MetaLabel>
      {items.map((it, i) => (
        <View key={i} style={i > 0 ? s.listItem : { marginTop: spacing.md }}>
          {fields.map((f, j) => (
            <TextInput
              key={f}
              value={it[f]}
              onChangeText={(v) => updateItem(i, f, v)}
              placeholder={placeholders[j]}
              placeholderTextColor={colors.gray400}
              style={[s.input, { marginTop: j > 0 ? spacing.sm : 0 }]}
            />
          ))}
          <Pressable onPress={() => removeItem(i)} style={s.removeBtn}>
            <Text style={s.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <SecondaryButton onPress={add}>+ Add {title.toLowerCase()}</SecondaryButton>
    </Card>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { padding: spacing.xl, paddingBottom: 96 },
  title: { fontSize: 22, fontWeight: '700', color: colors.gray900 },
  sub: { fontSize: 13, color: colors.gray500, marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.gray500, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    padding: spacing.md, fontSize: 15, color: colors.gray900,
    backgroundColor: colors.white,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.emerald50, borderColor: colors.emerald600 },
  chipText: { fontSize: 13, color: colors.gray500, fontWeight: '500' },
  chipTextOn: { color: colors.emerald700, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, marginTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.gray200,
  },
  toggleLabel: { fontSize: 15, color: colors.gray900, fontWeight: '500' },
  switch: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: colors.gray200,
    flexDirection: 'row', alignItems: 'center', padding: 2,
  },
  switchOn: { backgroundColor: colors.emerald600, justifyContent: 'flex-end' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  listItem: {
    marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray200,
    paddingTop: spacing.md,
  },
  removeBtn: { marginTop: spacing.sm, alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
  removeText: { fontSize: 13, color: colors.red600, fontWeight: '600' },
});