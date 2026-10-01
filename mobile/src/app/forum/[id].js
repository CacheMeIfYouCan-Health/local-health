import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Touchable, Ionicons, EmptyState } from '@/components/ui';
import { colors, spacing, radius, font, touch } from '@/lib/theme';
import { useSession } from '@/lib/session';
import { getToken } from '@/lib/auth';
import {
  getForum, postForumUpdate, postForumQuestion, getQuestionReplies, postQuestionReply,
  joinForum, leaveForum,
} from '@/lib/api';

const MAX = 500; // matches the backend / database limit
const POLL_MS = 15000;

function clock(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

/** Position for the one-off "At facility" check; null if denied/unavailable. */
async function currentPosition() {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: p.coords.latitude, longitude: p.coords.longitude };
  } catch {
    return null;
  }
}

function Bubble({ item, mine, showVerification, onPress, footer }) {
  const body = (
    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
      <Text style={s.meta}>
        <Text style={s.author}>{mine ? 'You' : item.author.name}</Text>
        {showVerification ? (
          item.locationVerified
            ? <Text style={s.verified}>  ·  At facility ✓</Text>
            : <Text style={s.unverified}>  ·  Unverified</Text>
        ) : null}
      </Text>
      <Text style={s.content}>{item.content}</Text>
      <View style={s.bubbleFooter}>
        {footer}
        <Text style={s.time}>{clock(item.createdAt)}</Text>
      </View>
    </View>
  );
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      {onPress ? <Touchable onPress={onPress} style={{ maxWidth: '85%', borderRadius: radius.lg }}>{body}</Touchable> : <View style={{ maxWidth: '85%' }}>{body}</View>}
    </View>
  );
}

export default function ForumScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const { status, user, signOut } = useSession();
  const signedIn = status === 'signedIn';

  const [tab, setTab] = useState('updates');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [question, setQuestion] = useState(null); // open thread
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const token = signedIn ? await getToken() : null;
      setData(await getForum(id, token));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [id, signedIn]);

  const loadReplies = useCallback(async (qid) => {
    try {
      const r = await getQuestionReplies(qid);
      setReplies(r.replies ?? []);
    } catch {
      /* keep what we have */
    }
  }, []);

  // Initial load + light polling instead of a live socket connection.
  useEffect(() => {
    load();
    const t = setInterval(() => {
      load();
      if (question) loadReplies(question.id);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load, loadReplies, question]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    if (question) await loadReplies(question.id);
    setRefreshing(false);
  };

  const openQuestion = (q) => {
    setQuestion(q);
    setReplies([]);
    loadReplies(q.id);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      if (tab === 'updates') {
        const pos = await currentPosition();
        await postForumUpdate(id, { content, ...pos }, token);
      } else if (question) {
        await postQuestionReply(question.id, content, token);
        await loadReplies(question.id);
      } else {
        await postForumQuestion(id, content, token);
      }
      setText('');
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e) {
      Alert.alert('Could not send', e.status === 401 ? 'Please log in again.' : e.message);
    } finally {
      setSending(false);
    }
  };

  const toggleFollow = async () => {
    try {
      const token = await getToken();
      const res = data?.forum?.isMember ? await leaveForum(id, token) : await joinForum(id, token);
      setData((d) => ({ ...d, forum: { ...d.forum, ...res.forum } }));
      Alert.alert(res.forum.isMember ? 'Following this forum' : 'You left this forum', res.forum.isMember ? '' : 'You can come back any time from Nearby.');
    } catch (e) {
      Alert.alert('Something went wrong', e.message);
    }
  };

  const title = data?.forum?.location?.name ?? name ?? 'Forum';
  const items = !data ? [] : tab === 'updates' ? data.updates : question ? replies : data.questions;

  const placeholder =
    tab === 'updates' ? 'Share an update about this place…' : question ? 'Write a reply…' : 'Ask a question…';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header: back, tabs, follow/leave */}
      <View style={s.header}>
        <Touchable onPress={() => (question ? setQuestion(null) : router.back())} style={s.iconBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <View style={s.tabs}>
          {['updates', 'questions'].map((k) => (
            <Touchable
              key={k}
              onPress={() => { setTab(k); setQuestion(null); }}
              style={[s.tab, tab === k && s.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
            >
              <Text style={[s.tabText, tab === k && s.tabTextActive]}>{k === 'updates' ? 'Updates' : 'Questions'}</Text>
            </Touchable>
          ))}
        </View>
        {signedIn && data ? (
          <Touchable onPress={toggleFollow} style={s.iconBtn} accessibilityLabel={data.forum.isMember ? 'Leave forum' : 'Follow forum'}>
            <Ionicons name={data.forum.isMember ? 'exit-outline' : 'notifications-outline'} size={22} color={data.forum.isMember ? colors.red600 : colors.text} />
          </Touchable>
        ) : <View style={s.iconBtn} />}
      </View>
      <Text style={s.place} numberOfLines={1}>{question ? 'Question' : title}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!data && !error ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.emerald600} />
        ) : error && !data ? (
          <EmptyState icon="cloud-offline-outline" title="Forum unavailable" message={error} />
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(m) => m.id}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onContentSizeChange={() => tab === 'updates' && listRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              tab === 'updates' && data.summary ? (
                <View style={s.summary}>
                  <Text style={s.summaryTitle}>✨ AI Summary</Text>
                  <Text style={s.summarySub}>Summary of the past {data.summary.messageCount} messages</Text>
                  <Text style={s.summaryText}>{data.summary.summary}</Text>
                </View>
              ) : question ? (
                <View style={{ marginBottom: spacing.md }}>
                  <Bubble item={question} mine={question.author.id === String(user?.id)} />
                  <Text style={s.repliesLabel}>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={s.empty}>
                {tab === 'updates'
                  ? 'No updates yet. If you are here now, share what it is like.'
                  : question ? 'No replies yet.' : 'No questions yet. Ask anything before you visit.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Bubble
                item={item}
                mine={item.author.id === String(user?.id)}
                showVerification={tab === 'updates'}
                onPress={tab === 'questions' && !question ? () => openQuestion(item) : undefined}
                footer={tab === 'questions' && !question ? (
                  <Text style={s.replyCount}>{item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}</Text>
                ) : null}
              />
            )}
          />
        )}

        {/* Composer */}
        {signedIn ? (
          <View style={s.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.gray400}
              maxLength={MAX}
              multiline
              style={s.input}
            />
            <Touchable
              onPress={send}
              disabled={!text.trim() || sending}
              style={[s.send, (!text.trim() || sending) && { backgroundColor: colors.gray300 }]}
              accessibilityLabel="Send"
            >
              {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={20} color={colors.white} />}
            </Touchable>
          </View>
        ) : (
          <View style={s.composer}>
            <Touchable onPress={signOut} style={s.loginBtn} accessibilityRole="button">
              <Text style={s.loginText}>Log in to post</Text>
            </Touchable>
          </View>
        )}
        {signedIn && tab === 'updates' ? (
          <Text style={s.hint}>📍 Your location is checked once to show "At facility". It is never shared.</Text>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingTop: spacing.xs, gap: spacing.sm },
  iconBtn: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center' },
  tabs: { flex: 1, flexDirection: 'row', backgroundColor: colors.gray200, borderRadius: radius.pill, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: font.small, fontWeight: '600', color: colors.textSubtle },
  tabTextActive: { color: colors.text },
  place: { textAlign: 'center', fontSize: 12, color: colors.textSubtle, marginTop: 4, marginBottom: spacing.xs, paddingHorizontal: spacing.xl },
  list: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  bubble: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.emerald50, borderColor: colors.emerald100, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: colors.card, borderColor: colors.borderSoft, borderBottomLeftRadius: 6 },
  meta: { fontSize: 13 },
  author: { fontWeight: '700', color: colors.gray700 },
  verified: { color: colors.emerald700, fontWeight: '600' },
  unverified: { color: colors.gray400 },
  content: { fontSize: font.body, color: colors.text, marginTop: 4, lineHeight: 22 },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  time: { fontSize: 11, color: colors.gray400 },
  replyCount: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.gray100, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  repliesLabel: { fontSize: 12, fontWeight: '700', color: colors.textSubtle, textTransform: 'uppercase', marginTop: spacing.md },
  summary: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xs },
  summaryTitle: { fontSize: font.small, fontWeight: '700', color: '#312e81' },
  summarySub: { fontSize: 12, color: '#4338ca', marginTop: 2 },
  summaryText: { fontSize: 15, color: colors.text, marginTop: spacing.sm, lineHeight: 21 },
  empty: { textAlign: 'center', color: colors.textSubtle, marginTop: spacing.xxl * 2, paddingHorizontal: spacing.xl, lineHeight: 21 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.card },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: font.body, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.emerald600, alignItems: 'center', justifyContent: 'center' },
  loginBtn: { flex: 1, minHeight: touch, borderRadius: radius.md, backgroundColor: colors.emerald600, alignItems: 'center', justifyContent: 'center' },
  loginText: { color: colors.white, fontSize: font.body, fontWeight: '700' },
  hint: { fontSize: 11, color: colors.gray400, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, backgroundColor: colors.card },
});
