import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, spacing, font } from '@/lib/theme';

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function PrimaryButton({ onPress, disabled, busy, children }) {
  const isDisabled = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.primary,
        isDisabled && s.primaryDisabled,
        pressed && !isDisabled && s.primaryPressed,
      ]}
    >
      {busy ? <ActivityIndicator color={colors.white} /> : (
        <Text style={s.primaryText}>{children}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ onPress, disabled, children }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.secondary,
        disabled && { opacity: 0.5 },
        pressed && !disabled && s.secondaryPressed,
      ]}
    >
      <Text style={s.secondaryText}>{children}</Text>
    </Pressable>
  );
}

export function Row({ label, value, accent }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, accent && { color: '#1d4ed8' }]}>{value}</Text>
    </View>
  );
}

export function MetaLabel({ children }) {
  return <Text style={s.metaLabel}>{children}</Text>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  primary: {
    marginTop: spacing.xxl,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.emerald600,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryPressed: { backgroundColor: colors.emerald700 },
  primaryDisabled: { backgroundColor: colors.gray200 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  secondary: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  secondaryPressed: { backgroundColor: colors.emerald50, borderColor: colors.emerald600 },
  secondaryText: { color: colors.gray900, fontSize: font.body, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingVertical: spacing.sm,
  },
  rowLabel: { fontSize: 14, color: colors.gray500 },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray500,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});