import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Field, PrimaryButton, Notice, Touchable, Ionicons } from '@/components/ui';
import { colors, spacing, radius, touch } from '@/lib/theme';
import { login, signup } from '@/lib/api';
import { useSession } from '@/lib/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { signIn, continueAsGuest } = useSession();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const isSignup = mode === 'signup';

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setError(null);
    setFieldErrors({});
  };

  const validate = () => {
    const errs = {};
    if (isSignup && !name.trim()) errs.name = 'Please enter your name.';
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email address.';
    if (!password) errs.password = 'Please enter your password.';
    else if (isSignup && password.length < 8) errs.password = 'Use at least 8 characters.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async () => {
    if (busy) return;
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const creds = { email: email.trim().toLowerCase(), password };
      const data = isSignup ? await signup({ ...creds, name: name.trim() }) : await login(creds);
      if (!data?.token) throw new Error('The server did not return a session. Please try again.');
      // Flipping the session to signedIn makes the Stack.Protected guard in
      // _layout.js move us to the tabs automatically.
      await signIn({ token: data.token, user: data.user });
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onGuest = () => continueAsGuest();

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <View style={s.logo}>
              <Ionicons name="medkit" size={30} color={colors.white} />
            </View>
            <Text style={s.appName}>LocalHealth</Text>
            <Text style={s.tagline}>Emergency help, nearby clinics and your medical info — even offline.</Text>
          </View>

          <Card>
            <Text style={s.title} accessibilityRole="header">
              {isSignup ? 'Create an account' : 'Sign in'}
            </Text>
            <Text style={s.sub}>
              {isSignup ? 'It takes less than a minute.' : 'Use the same account as the LocalHealth website.'}
            </Text>

            {isSignup && (
              <Field
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Thandi Mokoena"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
                error={fieldErrors.name}
              />
            )}

            <Field
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType={isSignup ? 'emailAddress' : 'username'}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={fieldErrors.email}
            />

            <Field
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              textContentType={isSignup ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              error={fieldErrors.password}
              accessory={(
                <Touchable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  style={s.eye}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
                </Touchable>
              )}
            />

            {error ? <Notice tone="error">{error}</Notice> : null}

            <PrimaryButton onPress={onSubmit} busy={busy}>
              {isSignup ? 'Create account' : 'Sign in'}
            </PrimaryButton>

            <Touchable onPress={switchMode} style={s.link} accessibilityRole="button">
              <Text style={s.linkText}>
                {isSignup ? 'Already have an account? ' : 'New here? '}
                <Text style={s.linkStrong}>{isSignup ? 'Sign in' : 'Create account'}</Text>
              </Text>
            </Touchable>
          </Card>

          <Touchable onPress={onGuest} style={s.guest} accessibilityRole="button">
            <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.emerald700} />
            <View style={{ flex: 1 }}>
              <Text style={s.guestTitle}>Continue without an account</Text>
              <Text style={s.guestSub}>SOS, nearby facilities, medical info, reminders and airtime all work without signing in.</Text>
            </View>
          </Touchable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl * 2, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.emerald600,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  appName: { fontSize: 26, fontWeight: '800', color: colors.text },
  tagline: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 21, paddingHorizontal: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 14, color: colors.textSubtle, marginTop: 2 },
  eye: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  link: { minHeight: touch, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, borderRadius: radius.md },
  linkText: { fontSize: 15, color: colors.textMuted },
  linkStrong: { color: colors.emerald700, fontWeight: '700' },
  guest: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: touch, padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  guestTitle: { fontSize: 16, fontWeight: '700', color: colors.emerald700 },
  guestSub: { fontSize: 13, color: colors.textSubtle, marginTop: 2, lineHeight: 18 },
});
