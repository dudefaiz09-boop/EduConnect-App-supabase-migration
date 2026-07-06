import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AppRefreshControl,
  Card,
  EmptyState,
  LoadingState,
  ModuleErrorState,
  ModuleHeader,
  Pill,
} from '@educonnect/mobile-ui';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService } from '../lib/api-client';
import { colors, formatDate } from '../theme';

type NotificationRecord = {
  id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  readBy?: string[];
  href?: string | null;
  type?: string;
  createdAt?: string;
};

type NotificationsScreenProps = {
  onClose: () => void;
};

export function NotificationsScreen({ onClose }: NotificationsScreenProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.uid;

  const isRead = useCallback(
    (item: NotificationRecord) => Boolean(item.read || (userId && item.readBy?.includes(userId))),
    [userId]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !isRead(item)).length,
    [isRead, notifications]
  );

  const readCount = notifications.length - unreadCount;

  const reload = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const data = await notificationsService.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void reload();
    }, 0);
    return () => clearTimeout(id);
  }, [reload]);

  const markRead = useCallback(
    async (item: NotificationRecord) => {
      if (!item.id || isRead(item) || !userId) return;

      const original = notifications;
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === item.id
            ? {
                ...notification,
                readBy: Array.from(new Set([...(notification.readBy || []), userId])),
              }
            : notification
        )
      );

      try {
        await notificationsService.markRead(item.id);
      } catch (err) {
        setNotifications(original);
        Alert.alert('Update failed', (err as Error).message || 'Unable to mark notification read.');
      }
    },
    [isRead, notifications, userId]
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0 || !userId) return;

    const original = notifications;
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        readBy: Array.from(new Set([...(notification.readBy || []), userId])),
      }))
    );

    try {
      await notificationsService.markAllRead();
    } catch (err) {
      setNotifications(original);
      Alert.alert('Update failed', (err as Error).message || 'Unable to mark all as read.');
    }
  }, [notifications, unreadCount, userId]);

  const clearRead = useCallback(async () => {
    if (readCount === 0) return;

    const original = notifications;
    setNotifications((prev) => prev.filter((item) => !isRead(item)));

    try {
      await notificationsService.clearRead();
    } catch (err) {
      setNotifications(original);
      Alert.alert('Clear failed', (err as Error).message || 'Unable to clear read notifications.');
    }
  }, [isRead, notifications, readCount]);

  if (loading) {
    return (
      <View style={styles.flex}>
        <ModuleHeader title="Notifications" subtitle="School updates and alerts.">
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </ModuleHeader>
        <LoadingState title="Loading notifications" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ModuleHeader title="Notifications" subtitle={`${unreadCount} unread updates`}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </ModuleHeader>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          disabled={unreadCount === 0}
          onPress={markAllRead}
          style={[styles.actionButton, unreadCount === 0 && styles.disabledButton]}
        >
          <Text style={styles.actionButtonText}>Mark all read</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={readCount === 0}
          onPress={clearRead}
          style={[styles.secondaryButton, readCount === 0 && styles.disabledButton]}
        >
          <Text style={styles.secondaryButtonText}>Clear read</Text>
        </TouchableOpacity>
      </View>

      {error ? <ModuleErrorState message={error} onRetry={() => void reload(true)} /> : null}

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item.id || `notification-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} />
        }
        ListEmptyComponent={
          error ? null : (
            <EmptyState
              title="All caught up"
              body="New announcements, chats, assignments, and admin updates will appear here."
            />
          )
        }
        renderItem={({ item }) => {
          const read = isRead(item);
          return (
            <TouchableOpacity activeOpacity={0.82} onPress={() => void markRead(item)}>
              <Card style={[styles.notificationCard, !read && styles.unreadCard]}>
                <View style={styles.notificationHeader}>
                  <Pill label={read ? 'read' : 'new'} tone={read ? 'blue' : 'green'} />
                </View>
                <Text style={styles.notificationTitle}>{item.title || 'Notification'}</Text>
                <Text style={styles.notificationMessage}>
                  {item.message || 'You have a new school update.'}
                </Text>
                <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.ai,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  actionButtonText: {
    color: '#07111f',
    fontSize: 12,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: colors.whiteSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationCard: {
    marginBottom: 12,
  },
  notificationDate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  notificationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationMessage: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  notificationTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  secondaryButtonText: {
    color: colors.whiteSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  unreadCard: {
    backgroundColor: colors.featuredBg,
    borderColor: colors.featuredBorder,
  },
});
