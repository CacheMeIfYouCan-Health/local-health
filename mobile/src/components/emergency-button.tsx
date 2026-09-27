import { Alert, Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type EmergencyButtonProps = {
  facilityName: string;
  phone: string;
};

export function EmergencyButton({ facilityName, phone }: EmergencyButtonProps) {
  const handlePress = () => {
    Alert.alert(
      'Confirm call',
      `Call ${facilityName}?\n\n${phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(`tel:${phone}`) },
      ],
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.label}>
        Emergency
      </ThemedText>
      <ThemedText type="small" style={styles.sub}>
        Call {facilityName}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#d32f2f',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: { opacity: 0.7 },
  label: { color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
  sub: { color: '#ffe5e5' },
});
