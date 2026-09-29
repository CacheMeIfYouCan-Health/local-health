import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Card, PrimaryButton, MetaLabel } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { saveToken } from '@/lib/auth';

// Replace with your actual Next.js OAuth URL
const AUTH_URL = 'https://your-web-app.com/api/auth/mobile';

export default function Login() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    setBusy(true);
    try {
      const redirectUrl = Linking.createURL('auth-callback');
      const result = await WebBrowser.openAuthSessionAsync(AUTH_URL, redirectUrl);

      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const token = queryParams?.token;
        if (token) {
          await saveToken(token);
          router.replace('/(tabs)');
        } else {
          Alert.alert('Login failed', 'No token returned');
        }
      }
    } catch (e) {
      Alert.alert('Login error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>Sign in</Text>
        <Text style={s.sub}>Link your mobile app to your web account.</Text>

        <Card>
          <MetaLabel>Account</MetaLabel>
          <Text style={s.body}>
            You'll be redirected to the web app to sign in. After that, you'll be
            returned here automatically.
          </Text>
          <PrimaryButton onPress={onLogin} busy={busy}>
            Sign in with web
          </PrimaryButton>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { padding: spacing.xl, paddingTop: spacing.xxl * 2 },
  title: { fontSize: 22, fontWeight: '700', color: colors.gray900 },
  sub: { fontSize: 13, color: colors.gray500, marginBottom: spacing.lg },
  body: { fontSize: 14, color: colors.gray500, marginTop: spacing.md, marginBottom: spacing.lg, lineHeight: 20 },
});