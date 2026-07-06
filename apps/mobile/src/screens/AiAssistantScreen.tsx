import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Composer,
  EmptyState,
  LoadingState,
  ModuleErrorState as ErrorState,
  ModuleHeader,
  SegmentedControl,
  ModeChip,
} from '@educonnect/mobile-ui';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { apiClient } from '../lib/api-client';
import { colors } from '../theme';

type AiStatus = {
  enabled: boolean;
  provider?: string;
};

type AiResponse = {
  id?: string;
  response?: string;
  answer?: string;
  content?: string;
};

type ChatLog = {
  id: string;
  query: string;
  response: string;
};

const modes = [
  { key: 'chat', label: 'Ask' },
  { key: 'lesson', label: 'Lesson' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'report', label: 'Report' },
  { key: 'announcement', label: 'Draft' },
] as const;
type AiMode = typeof modes[number]['key'];

const rolePrompts = {
  admin: 'Summarize fee collection risks and recommend next actions.',
  principal: 'Create a weekly academic leadership briefing.',
  teacher: 'Generate a 10-question quiz with answers for tomorrow.',
  student: 'Explain a difficult concept with examples and revision notes.',
  parent: 'Summarize what I should check for my child this week.',
  librarian: 'Recommend books for Grade 10 science enrichment.',
  accountant: 'Create a friendly pending-fee reminder.',
  staff: "Summarize today's support priorities.",
};

function getAiResponseText(data: AiResponse) {
  return data.response || data.answer || data.content || 'No response.';
}

async function fetchAiStatus(): Promise<AiStatus> {
  try {
    return await apiClient.request<AiStatus>('/api/ai/status');
  } catch {
    return { enabled: false };
  }
}

export function AiAssistantScreen() {
  const { assignedModules, schoolId, role } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState<AiMode>('chat');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'fees',
    'attendance',
    'assignments',
    'performance',
    'library',
  ]);

  const listRef = useRef<FlatList>(null);

  const contextModules = useMemo(
    () => ['fees', 'attendance', 'assignments', 'performance', 'library'],
    []
  );

  const suggested = useMemo(() => {
    return rolePrompts[role as keyof typeof rolePrompts] || rolePrompts.student;
  }, [role]);

  const refreshStatus = useCallback(async () => {
    setStatusLoaded(false);
    setError(null);
    const data = await fetchAiStatus();
    setStatus(data);
    setStatusLoaded(true);
  }, []);

  const toggleModule = useCallback((moduleKey: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((m) => m !== moduleKey)
        : [...prev, moduleKey]
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchAiStatus().then((data) => {
      if (cancelled) return;
      setStatus(data);
      setStatusLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    if (logs.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs, loading]);

  const hasAssignedAiModule =
    assignedModules.length === 0 || assignedModules.includes('aiAssistant');
  const aiEnabled = Boolean(status?.enabled && hasAssignedAiModule);
  const aiAvailable = aiEnabled && !isOffline;

  const sendQuery = useCallback(async (retryQuery?: string) => {
    const trimmed = (retryQuery || query).trim();
    if (!trimmed || loading || !aiAvailable) return;

    const logId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLogs((previous) => [...previous, { id: logId, query: trimmed, response: '' }]);
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      let data: AiResponse;
      try {
        data = await apiClient.request<AiResponse>('/api/ai/context-query', {
          method: 'POST',
          body: JSON.stringify({
            query: trimmed,
            mode,
            modules: selectedModules,
          }),
        });
      } catch {
        data = await apiClient.request<AiResponse>('/api/ai/query', {
          method: 'POST',
          body: JSON.stringify({ query: trimmed, mode }),
        });
      }

      setLogs((previous) =>
        previous.map((log) =>
          log.id === logId
            ? { ...log, id: data.id || logId, response: getAiResponseText(data) }
            : log
        )
      );
    } catch (err: unknown) {
      setLogs((previous) => previous.filter((log) => log.id !== logId));
      setError((err as Error).message || 'Failed to get AI response.');
    } finally {
      setLoading(false);
    }
  }, [aiAvailable, loading, query, mode, selectedModules]);

  if (!statusLoaded) {
    return (
      <View style={styles.flex}>
        <ModuleHeader title="AI Assistant" subtitle="Role-aware assistant." />
        <LoadingState title="Checking AI availability" />
      </View>
    );
  }

  if (!aiEnabled) {
    return (
      <View style={styles.flex}>
        <ModuleHeader title="AI Assistant" subtitle="Role-aware assistant." />
        <EmptyState
          title="AI Unavailable"
          body="AI services are not configured for this tenant or your account. Please contact your administrator."
          action={{
            label: 'Retry',
            onPress: refreshStatus,
            accessibilityLabel: 'Retry AI availability check',
          }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      style={styles.flex}
    >
      <ModuleHeader
        title="AI Assistant"
        subtitle={
          isOffline ? 'Reconnect to ask AI questions.' : 'Ask questions about your work or studies.'
        }
      >
        <View style={styles.modeControl}>
          <SegmentedControl
            options={modes}
            selectedKey={mode}
            onSelect={(key) => setMode(key as AiMode)}
            scrollable
          />
        </View>
      </ModuleHeader>

      <View style={styles.chipsContainer}>
        <Text style={styles.chipsLabel}>Context Modules:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {contextModules.map((m) => (
            <ModeChip
              key={m}
              label={m.charAt(0).toUpperCase() + m.slice(1)}
              selected={selectedModules.includes(m)}
              onPress={() => toggleModule(m)}
            />
          ))}
        </ScrollView>
      </View>

      {error ? <ErrorState message={error} onRetry={() => sendQuery()} /> : null}

      <FlatList
        ref={listRef}
        contentContainerStyle={styles.chatList}
        data={logs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              title="How can I help?"
              body="Ask about assignments, attendance, fees, performance, or library resources available to your role."
            />
            {suggested ? (
              <TouchableOpacity
                onPress={() => setQuery(suggested)}
                style={styles.suggestionCard}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionTitle}>💡 Suggested for you:</Text>
                <Text style={styles.suggestionText}>{suggested}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.messageWrapper}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{item.query}</Text>
            </View>
            <Card style={styles.aiBubbleCard}>
              {item.response ? (
                <Text style={styles.aiText}>{item.response}</Text>
              ) : (
                <ActivityIndicator color={colors.ai} />
              )}
            </Card>
          </View>
        )}
      />
      <Composer
        value={query}
        onChangeText={setQuery}
        onSubmit={() => sendQuery()}
        disabled={loading || !query.trim() || !aiAvailable}
        loading={loading}
        editable={!loading && aiAvailable}
        returnKeyType="send"
        placeholder={isOffline ? 'AI is offline' : 'Ask a question...'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  aiBubbleCard: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  aiText: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  chatList: {
    flexGrow: 1,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  flex: {
    backgroundColor: colors.background,
    flex: 1,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  modeControl: {
    width: 150,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 18,
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipsLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  suggestionCard: {
    backgroundColor: colors.cardMuted || '#111c33',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    width: '100%',
  },
  suggestionTitle: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  suggestionText: {
    color: colors.whiteSoft,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default AiAssistantScreen;
