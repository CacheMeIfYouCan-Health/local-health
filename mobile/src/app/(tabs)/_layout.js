import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.emerald600,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: { borderTopColor: colors.gray200 },
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Home' }} />
      <Tabs.Screen name="medical"   options={{ title: 'Medical' }} />
      <Tabs.Screen name="reminders" options={{ title: 'Reminders' }} />
      <Tabs.Screen name="vouchers"  options={{ title: 'Airtime' }} />
      <Tabs.Screen name="facilities" options={{ title: 'Nearby' }} />
    </Tabs>
  );
}