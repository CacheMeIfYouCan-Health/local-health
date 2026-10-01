import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors } from '@/lib/theme';
import { ensureFacilities } from '@/features/facilities/store';

const icon = (name, activeName) => function TabIcon({ color, focused, size }) {
  return <Ionicons name={focused ? activeName : name} size={size ?? 24} color={color} />;
};

export default function TabsLayout() {
  // Load the offline facilities cache; fetch once automatically if it's empty.
  useEffect(() => { ensureFacilities(); }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.emerald700,
        tabBarInactiveTintColor: colors.gray500,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          ...(Platform.OS === 'android' ? { elevation: 8 } : null),
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SOS',
          tabBarActiveTintColor: colors.red600,
          tabBarIcon: icon('alert-circle-outline', 'alert-circle'),
          tabBarAccessibilityLabel: 'SOS emergency',
        }}
      />
      <Tabs.Screen name="facilities" options={{ title: 'Nearby', tabBarIcon: icon('location-outline', 'location') }} />
      <Tabs.Screen name="medical" options={{ title: 'Medical', tabBarIcon: icon('heart-outline', 'heart') }} />
      <Tabs.Screen name="reminders" options={{ title: 'Reminders', tabBarIcon: icon('alarm-outline', 'alarm') }} />
      <Tabs.Screen name="vouchers" options={{ title: 'Airtime', tabBarIcon: icon('card-outline', 'card') }} />
    </Tabs>
  );
}
