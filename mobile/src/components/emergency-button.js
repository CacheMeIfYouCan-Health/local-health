import { Text, StyleSheet, View } from 'react-native';
import { Touchable, Ionicons } from '@/components/ui';
import { colors, radius, shadow } from '@/lib/theme';

/** The big red SOS button. */
export default function EmergencyButton({ onPress, subtitle }) {
  return (
    <View style={s.wrap}>
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="SOS. Call for emergency help"
        accessibilityHint={subtitle}
        rippleColor="rgba(255,255,255,0.3)"
        pressedOpacity={0.8}
        style={s.sos}
      >
        <Ionicons name="call" size={30} color={colors.white} />
        <Text style={s.sosText}>SOS</Text>
        <Text style={s.sosSub} numberOfLines={2}>{subtitle}</Text>
      </Touchable>
    </View>
  );
}

const s = StyleSheet.create({
  // Shadow lives on a wrapper so Android's ripple clipping doesn't hide it.
  wrap: { borderRadius: radius.xl, marginBottom: 16, backgroundColor: colors.red600, ...shadow(3) },
  sos: {
    backgroundColor: colors.red600,
    borderRadius: radius.xl,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  sosText: { color: colors.white, fontSize: 46, fontWeight: '800', letterSpacing: 3, marginTop: 4 },
  sosSub: { color: colors.white, fontSize: 15, marginTop: 4, opacity: 0.95, textAlign: 'center' },
});
