import { forwardRef } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors, radius, spacing, font, touch, shadow } from '@/lib/theme';

export { Ionicons };

const isAndroid = Platform.OS === 'android';

/**
 * Pressable with platform-appropriate feedback:
 * - Android: material ripple (clipped to the rounded shape)
 * - iOS: opacity fade while pressed
 */
export function Touchable({ style, rippleColor = 'rgba(15,23,42,0.12)', pressedOpacity = 0.6, children, ...rest }) {
  return (
    <Pressable
      android_ripple={isAndroid ? { color: rippleColor } : undefined}
      style={({ pressed }) => [
        isAndroid && s.clip,
        typeof style === 'function' ? style({ pressed }) : style,
        !isAndroid && pressed && { opacity: pressedOpacity },
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

export function Card({ children, style, tone }) {
  return (
    <View
      style={[
        s.card,
        tone === 'danger' && s.cardDanger,
        tone === 'info' && s.cardInfo,
        tone === 'warning' && s.cardWarning,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({ onPress, disabled, busy, children, icon, tone = 'primary', style, accessibilityLabel }) {
  const isDisabled = disabled || busy;
  const bg = tone === 'danger' ? colors.red600 : colors.emerald600;
  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!isDisabled, busy: !!busy }}
      rippleColor="rgba(255,255,255,0.25)"
      style={[s.primary, { backgroundColor: bg }, isDisabled && s.primaryDisabled, style]}
    >
      {busy ? <ActivityIndicator color={colors.white} /> : (
        <View style={s.btnInner}>
          {icon ? <Ionicons name={icon} size={20} color={colors.white} /> : null}
          <Text style={s.primaryText}>{children}</Text>
        </View>
      )}
    </Touchable>
  );
}

export function SecondaryButton({ onPress, disabled, busy, children, icon, tone, style, accessibilityLabel }) {
  const isDisabled = disabled || busy;
  const fg = tone === 'danger' ? colors.red700 : colors.text;
  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!isDisabled, busy: !!busy }}
      style={[s.secondary, isDisabled && { opacity: 0.5 }, style]}
    >
      {busy ? <ActivityIndicator color={colors.emerald700} /> : (
        <View style={s.btnInner}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[s.secondaryText, { color: fg }]}>{children}</Text>
        </View>
      )}
    </Touchable>
  );
}

export function Row({ label, value, accent }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, accent && { color: colors.blue700 }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function MetaLabel({ children, style }) {
  return <Text style={[s.metaLabel, style]}>{children}</Text>;
}

/** Selectable pill used for filters and single/multi choice. */
export function Chip({ label, selected, onPress, icon, count }) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={4}
      style={[s.chip, selected && s.chipOn]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.emerald700 : colors.textMuted} /> : null}
      <Text style={[s.chipText, selected && s.chipTextOn]}>
        {label}{count != null ? ` (${count})` : ''}
      </Text>
    </Touchable>
  );
}

/** Labelled text input with optional error / hint text. */
export const Field = forwardRef(function Field(
  { label, error, hint, multiline, height, style, accessory, ...rest },
  ref,
) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.gray400}
        style={[
          s.input,
          multiline && { height: height || 88, textAlignVertical: 'top', paddingTop: spacing.md },
          error && { borderColor: colors.red600 },
          accessory && { paddingRight: touch + 4 },
          style,
        ]}
        multiline={multiline}
        {...rest}
      />
      {accessory ? <View style={s.accessory}>{accessory}</View> : null}
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
});

/** Friendly empty state that tells the user what to do next. */
export function EmptyState({ icon = 'information-circle-outline', title, message, children }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={36} color={colors.gray400} />
      {title ? <Text style={s.emptyTitle}>{title}</Text> : null}
      {message ? <Text style={s.emptyText}>{message}</Text> : null}
      {children}
    </View>
  );
}

/** Small inline message: error (red), info (blue), warning (amber), success. */
export function Notice({ tone = 'info', icon, children }) {
  const map = {
    error: { bg: colors.red50, fg: colors.red700, icon: 'alert-circle' },
    warning: { bg: colors.amber50, fg: colors.amber700, icon: 'warning' },
    info: { bg: colors.blue50, fg: colors.blue700, icon: 'information-circle' },
    success: { bg: colors.emerald50, fg: colors.emerald800, icon: 'checkmark-circle' },
  }[tone];
  return (
    <View style={[s.notice, { backgroundColor: map.bg }]} accessibilityRole="alert">
      <Ionicons name={icon || map.icon} size={18} color={map.fg} style={{ marginTop: 1 }} />
      <Text style={[s.noticeText, { color: map.fg }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  clip: { overflow: 'hidden' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow(1),
  },
  cardDanger: { backgroundColor: colors.red50, borderColor: colors.red100 },
  cardInfo: { backgroundColor: colors.blue50, borderColor: '#bfdbfe' },
  cardWarning: { backgroundColor: colors.amber50, borderColor: '#fde68a' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryDisabled: { backgroundColor: colors.gray400 },
  primaryText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  secondary: {
    marginTop: spacing.sm,
    minHeight: touch,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: font.body, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingVertical: spacing.sm + 2,
  },
  rowLabel: { fontSize: font.small, color: colors.textSubtle },
  rowValue: { fontSize: font.small, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.emerald50, borderColor: colors.emerald600 },
  chipText: { fontSize: font.small, color: colors.textMuted, fontWeight: '500' },
  chipTextOn: { color: colors.emerald700, fontWeight: '700' },
  accessory: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  fieldLabel: { fontSize: font.small, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  fieldError: { fontSize: 13, color: colors.red600, marginTop: 4 },
  fieldHint: { fontSize: 13, color: colors.textSubtle, marginTop: 4 },
  input: {
    minHeight: touch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.input,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: font.small, color: colors.textSubtle, textAlign: 'center', lineHeight: 20 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noticeText: { flex: 1, fontSize: font.small, lineHeight: 20, fontWeight: '500' },
});
