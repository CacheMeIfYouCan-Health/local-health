import { View, Text, StyleSheet, Alert } from 'react-native';
import { Card, Touchable, Ionicons } from '@/components/ui';
import { colors, spacing, radius, touch } from '@/lib/theme';
import { useSession } from '@/lib/session';

/** Small account row: shows who is signed in and a Sign out / Sign in action. */
export default function AccountRow() {
  const { status, user, signOut } = useSession();
  const signedIn = status === 'signedIn';

  const onPress = () => {
    if (!signedIn) return signOut(); // guest -> back to the login screen
    Alert.alert(
      'Sign out?',
      'Your medical info, reminders, vouchers and saved facilities stay on this phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOut },
      ],
    );
  };

  return (
    <Card style={s.card}>
      <View style={s.avatar}>
        <Ionicons name={signedIn ? 'person' : 'person-outline'} size={20} color={colors.emerald700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {signedIn ? (user?.name || 'Signed in') : 'Not signed in'}
        </Text>
        <Text style={s.email} numberOfLines={1}>
          {signedIn ? (user?.email || '') : 'Emergency features work without an account'}
        </Text>
      </View>
      <Touchable onPress={onPress} accessibilityRole="button" style={s.btn}>
        <Text style={[s.btnText, signedIn && { color: colors.red700 }]}>
          {signedIn ? 'Sign out' : 'Sign in'}
        </Text>
      </Touchable>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.emerald50,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textSubtle, marginTop: 1 },
  btn: {
    minHeight: touch, minWidth: touch, paddingHorizontal: spacing.md,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: colors.emerald700 },
});
