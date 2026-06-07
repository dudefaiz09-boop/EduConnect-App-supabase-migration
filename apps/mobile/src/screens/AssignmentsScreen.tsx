import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, EmptyState, LoadingState, ModuleErrorState, Pill } from '@educonnect/mobile-ui';
import { useAssignments } from '@educonnect/shared-api';
import { useAuth } from '../contexts/AuthContext';
import { assignmentsService } from '../lib/api-client';
import { colors } from '../theme';

export const AssignmentsScreen = () => {
  const { schoolId } = useAuth();
  const {
    data: assignments = [],
    dataUpdatedAt,
    error,
    isError,
    isLoading,
    refetch,
    isRefetching,
  } = useAssignments(assignmentsService, schoolId);

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.container}>
        <LoadingState title="Loading assignments" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <ModuleErrorState
          message={(error as Error)?.message || 'Please check your connection and try again.'}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={assignments}
      keyExtractor={(item) => item.id!}
      contentContainerStyle={styles.container}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      refreshControl={
        <RefreshControl
          tintColor={colors.ai}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
        />
      }
      renderItem={({ item }) => (
        <Card>
          <View style={styles.cardHeader}>
            <Pill label={item.status} />
            <Text style={styles.title}>{item.title}</Text>
          </View>
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.dueDate}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
            <Text style={styles.points}>{item.pointsPossible} pts</Text>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <EmptyState
          title="No assignments found"
          body="New class work will show up here when available."
        />
      }
      ListFooterComponent={
        assignments.length > 0 ? (
          <Text style={styles.syncedText}>
            Last synced{' '}
            {dataUpdatedAt
              ? new Date(dataUpdatedAt).toLocaleString([], {
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  month: 'short',
                })
              : 'Not synced yet'}
          </Text>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    marginBottom: 10,
  },
  container: {
    paddingBottom: 12,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  dueDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  points: {
    color: colors.link,
    fontSize: 12,
    fontWeight: '900',
  },
  syncedText: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
});
