import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, getToken, clearToken } from './auth';
import { getMe } from './api';

const PROFILE_KEY = 'user_profile';
const GUEST_KEY = 'guest_mode';

/**
 * Session state for login gating.
 *
 * status:
 *  - 'loading'  : reading token from secure storage on launch
 *  - 'signedIn' : a token is stored (user profile cached locally)
 *  - 'guest'    : user chose "Continue without an account"
 *  - 'signedOut': show the login screen
 *
 * Why a guest mode: the SOS / Nearby / Medical / Reminders / Airtime features
 * all work from on-device data and must never be blocked by a login screen,
 * a lost password or a missing network connection in an emergency. An account
 * is only needed for features that live on the server (e.g. the web
 * community), so we offer it but don't force it. The guest choice is
 * remembered so the login screen isn't shown on every launch.
 */
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [token, rawProfile, guest] = await Promise.all([
        getToken().catch(() => null),
        AsyncStorage.getItem(PROFILE_KEY).catch(() => null),
        AsyncStorage.getItem(GUEST_KEY).catch(() => null),
      ]);
      if (cancelled) return;

      if (token) {
        setUser(rawProfile ? JSON.parse(rawProfile) : null);
        // Enter the app immediately (offline-first) ...
        setStatus('signedIn');
        // ... then quietly validate the token. Only a definite 401 ends the
        // session; network errors are ignored so the app keeps working
        // offline. On expiry we drop to guest mode rather than yanking the
        // user to a login screen mid-use.
        getMe(token)
          .then((data) => {
            if (cancelled || !data?.user) return;
            const profile = { id: data.user.id, name: data.user.name, email: data.user.email };
            setUser(profile);
            AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => {});
          })
          .catch(async (e) => {
            if (cancelled || e?.status !== 401) return;
            await clearToken().catch(() => {});
            await AsyncStorage.multiRemove([PROFILE_KEY]).catch(() => {});
            await AsyncStorage.setItem(GUEST_KEY, '1').catch(() => {});
            setUser(null);
            setStatus('guest');
          });
      } else {
        setStatus(guest === '1' ? 'guest' : 'signedOut');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async ({ token, user: u }) => {
    const profile = u ? { id: u.id, name: u.name, email: u.email } : null;
    await saveToken(token);
    if (profile) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    await AsyncStorage.removeItem(GUEST_KEY);
    setUser(profile);
    setStatus('signedIn');
  }, []);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, '1');
    setStatus('guest');
  }, []);

  /** Clears the token and profile and returns to the login screen. */
  const signOut = useCallback(async () => {
    await clearToken().catch(() => {});
    await AsyncStorage.multiRemove([PROFILE_KEY, GUEST_KEY]).catch(() => {});
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signOut, continueAsGuest }),
    [status, user, signIn, signOut, continueAsGuest],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
