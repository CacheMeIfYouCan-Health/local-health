import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Switch, Platform } from 'react-native';
import Screen from '@/components/screen';
import { Card, PrimaryButton, SecondaryButton, MetaLabel, Chip, Field as UIField, Touchable } from '@/components/ui';
import { colors, spacing, radius, touch } from '@/lib/theme';
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

  // Personal medical info never leaves the phone — it is not sent to the backend.
  const save = async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
    Alert.alert('Saved', 'Your medical info is stored only on this phone.');
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
    <Screen
      keyboard
      title="Medical info"
      subtitle="Details a doctor or paramedic may need in an emergency. Stored only on this phone — never uploaded."
    >

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
              {COMMON_CONDITIONS.map((c) => (
                <Chip key={c} label={c} selected={profile.conditions.includes(c)} onPress={() => toggleCondition(c)} />
              ))}
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

          <PrimaryButton onPress={save} icon="save-outline">Save medical info</PrimaryButton>
    </Screen>
  );
}

function Field(props) {
  return <UIField {...props} />;
}

function Segmented({ label, options, value, onSelect, wrap }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.chipWrap}>
        {options.map((o) => (
          <Chip key={o} label={o} selected={value === o} onPress={() => onSelect(o)} />
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, value, onToggle }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        accessibilityLabel={label}
        trackColor={{ false: colors.gray300, true: Platform.OS === 'android' ? colors.emerald100 : colors.emerald600 }}
        thumbColor={Platform.OS === 'android' ? (value ? colors.emerald600 : colors.gray50) : undefined}
        ios_backgroundColor={colors.gray300}
      />
    </View>
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
          <Touchable onPress={() => removeItem(i)} style={s.removeBtn} accessibilityRole="button">
            <Text style={s.removeText}>Remove</Text>
          </Touchable>
        </View>
      ))}
      {items.length === 0 ? (
        <Text style={s.emptyText}>None added. Tap below to add one.</Text>
      ) : null}
      <SecondaryButton icon="add" onPress={add}>Add {title === 'Allergies' ? 'an allergy' : 'a medication'}</SecondaryButton>
    </Card>
  );
}

const s = StyleSheet.create({
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input: {
    minHeight: touch, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: 16, color: colors.text, backgroundColor: colors.input,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: touch, marginTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  toggleLabel: { fontSize: 16, color: colors.text, fontWeight: '500' },
  listItem: {
    marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
  },
  removeBtn: {
    marginTop: spacing.sm, alignSelf: 'flex-end', minHeight: touch, justifyContent: 'center',
    paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  removeText: { fontSize: 15, color: colors.red600, fontWeight: '600' },
  emptyText: { fontSize: 14, color: colors.textSubtle, marginTop: spacing.sm },
});
