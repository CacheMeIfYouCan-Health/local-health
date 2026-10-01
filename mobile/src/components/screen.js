import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '@/lib/theme';

/**
 * Standard screen shell: safe area (top only — the tab bar handles the bottom
 * inset), soft slate background, a short title plus a one-line explanation,
 * and a scrollable body. Pass `keyboard` on screens with text inputs.
 */
export default function Screen({ title, subtitle, right, keyboard, scroll = true, children, refreshControl }) {
  const header = (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[s.container, { flex: 1 }]}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {keyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {body}
        </KeyboardAvoidingView>
      ) : body}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.textMuted, marginTop: 4, lineHeight: 21 },
});
