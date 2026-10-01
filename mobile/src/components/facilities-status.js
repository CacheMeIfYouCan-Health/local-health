import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Card, Notice, PrimaryButton, SecondaryButton, Touchable, Ionicons } from '@/components/ui';
import { colors, spacing, radius, touch } from '@/lib/theme';
import { relativeTime } from '@/lib/format';
import { refreshFacilities, FALLBACK_ORIGIN } from '@/features/facilities/store';

/** Re-render every minute so "updated 5 min ago" stays accurate. */
function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Shows the offline-cache status ("Saved for offline use · updated …"), the
 * Update button, the loading state and any error (permission denied, no
 * location, offline) with recovery actions.
 */
export default function FacilitiesStatus({ state, compact }) {
  const { cache, loading, error } = state;
  const now = useNow();

  return (
    <View>
      {loading ? (
        <Card tone="info">
          <View style={s.loadingRow}>
            <ActivityIndicator color={colors.blue700} />
            <View style={{ flex: 1 }}>
              <Text style={s.loadingTitle}>Finding facilities near you…</Text>
              <Text style={s.loadingSub}>
                The first search for an area can take up to 30 seconds. Results are saved so they work offline afterwards.
              </Text>
            </View>
          </View>
        </Card>
      ) : cache ? (
        <View style={s.statusRow}>
          <Ionicons name="cloud-done-outline" size={18} color={colors.emerald700} />
          <Text style={s.statusText} numberOfLines={2}>
            Saved for offline use · updated {relativeTime(cache.fetchedAt, now)}
            {cache.origin?.isFallback ? ` · around ${FALLBACK_ORIGIN.label}` : ''}
          </Text>
          {!compact && (
            <Touchable
              onPress={() => refreshFacilities()}
              accessibilityRole="button"
              accessibilityLabel="Update facilities from the internet"
              hitSlop={6}
              style={s.updateBtn}
            >
              <Ionicons name="refresh" size={16} color={colors.emerald700} />
              <Text style={s.updateText}>Update</Text>
            </Touchable>
          )}
        </View>
      ) : null}

      {error && !loading ? <ErrorBlock error={error} hasCache={!!cache} /> : null}
    </View>
  );
}

function ErrorBlock({ error, hasCache }) {
  const isLocation = error.kind === 'permission' || error.kind === 'location';
  const keepNote = hasCache ? ' Your saved list is still shown below.' : '';

  if (isLocation) {
    const blocked = error.kind === 'permission' && error.canAskAgain === false;
    return (
      <Card tone="warning">
        <Text style={s.errTitle}>
          {error.kind === 'permission' ? 'Location access needed' : 'Location unavailable'}
        </Text>
        <Text style={s.errText}>
          {error.message}
          {blocked ? ' Location is blocked for this app — enable it in Settings.' : ''}
          {keepNote}
        </Text>
        {blocked ? (
          <PrimaryButton icon="settings-outline" onPress={() => Linking.openSettings()}>Open Settings</PrimaryButton>
        ) : (
          <PrimaryButton icon="locate" onPress={() => refreshFacilities()}>Try again</PrimaryButton>
        )}
        <SecondaryButton icon="business-outline" onPress={() => refreshFacilities({ useFallback: true })}>
          Use {FALLBACK_ORIGIN.label} instead
        </SecondaryButton>
      </Card>
    );
  }

  return (
    <View>
      <Notice tone={hasCache ? 'warning' : 'error'}>
        {error.message}{keepNote}
      </Notice>
      {!hasCache && (
        <PrimaryButton icon="refresh" onPress={() => refreshFacilities()}>Try again</PrimaryButton>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  loadingRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: colors.blue700 },
  loadingSub: { fontSize: 14, color: colors.blue700, marginTop: 2, lineHeight: 20 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusText: { flex: 1, fontSize: 14, color: colors.textMuted },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    minHeight: touch - 8, minWidth: touch, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.emerald600,
    backgroundColor: colors.emerald50, justifyContent: 'center',
  },
  updateText: { fontSize: 14, fontWeight: '700', color: colors.emerald700 },
  errTitle: { fontSize: 16, fontWeight: '700', color: colors.amber700 },
  errText: { fontSize: 14, color: colors.gray700, marginTop: 4, lineHeight: 20 },
});
