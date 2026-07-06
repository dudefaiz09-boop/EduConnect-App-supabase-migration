import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  AppRefreshControl,
  Card,
  EmptyState,
  LoadingState,
  ModuleErrorState,
  Pill,
  SegmentedControl,
} from '@educonnect/mobile-ui';
import { useAssignments } from '@educonnect/shared-api';
import { useAuth } from '../contexts/AuthContext';
import { assignmentsService } from '../lib/api-client';
import { colors } from '../theme';

type MobileAssignment = Awaited<ReturnType<typeof assignmentsService.getAssignments>>[number];
type MobileSubmission = Awaited<ReturnType<typeof assignmentsService.getMyHistory>>[number];

export const AssignmentsScreen = () => {
  const { schoolId, user, classId, classIds, isStudent, isParent, isTeacher, isAdmin } = useAuth();
  const uid = user?.uid;

  const [selectedClass, setSelectedClass] = useState<string | null>(
    classId || (classIds.length > 0 ? classIds[0] : null)
  );

  const [selectedAssignment, setSelectedAssignment] = useState<MobileAssignment | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Record<string, MobileSubmission>>({});
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submissions, setSubmissions] = useState<MobileSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradingState, setGradingState] = useState<{
    studentId: string;
    grade: string;
    feedback: string;
  } | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  const {
    data: assignments = [],
    dataUpdatedAt,
    error,
    isError,
    isLoading,
    refetch,
    isRefetching,
  } = useAssignments(assignmentsService, selectedClass || schoolId);

  const classOptions = useMemo(() => {
    return classIds.map((id) => ({ key: id, label: id.replace(/-/g, ' ').toUpperCase() }));
  }, [classIds]);

  const loadMyHistory = useCallback(async () => {
    if ((!isStudent && !isParent) || !uid) return;
    try {
      const data = await assignmentsService.getMyHistory(uid);
      const map: Record<string, MobileSubmission> = {};
      if (Array.isArray(data)) {
        data.forEach((s) => (map[s.assignmentId] = s));
      }
      setMySubmissions(map);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, [isStudent, isParent, uid]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadMyHistory();
    }, 0);
    return () => clearTimeout(id);
  }, [loadMyHistory]);

  const loadSubmissions = useCallback(async (assignmentId: string) => {
    setSubmissionsLoading(true);
    try {
      const result = await assignmentsService.getSubmissions(assignmentId);
      setSubmissions(Array.isArray(result) ? result : []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAssignment?.id && (isTeacher || isAdmin)) {
      const id = setTimeout(() => {
        void loadSubmissions(selectedAssignment.id);
      }, 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [selectedAssignment, isTeacher, isAdmin, loadSubmissions]);

  const handleSubmission = async () => {
    if (!selectedAssignment?.id || !submissionContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await assignmentsService.submitAssignment({
        assignmentId: selectedAssignment.id,
        content: submissionContent,
      });
      await loadMyHistory();
      setSubmissionContent('');
      Alert.alert('Success', 'Assignment submitted successfully.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to submit assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrade = async (studentId: string) => {
    if (!selectedAssignment?.id || !gradingState || isGrading) return;
    setIsGrading(true);
    try {
      await assignmentsService.gradeSubmission({
        assignmentId: selectedAssignment.id,
        studentId,
        teacherScore: gradingState.grade,
        teacherFeedback: gradingState.feedback,
      });
      await loadSubmissions(selectedAssignment.id);
      setGradingState(null);
      Alert.alert('Success', 'Grade published successfully.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to grade submission.');
    } finally {
      setIsGrading(false);
    }
  };

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.centered}>
        <LoadingState title="Loading assignments" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <ModuleErrorState
          message={(error as Error)?.message || 'Please check your connection and try again.'}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  if (selectedAssignment) {
    const mySub = mySubmissions[selectedAssignment.id!];
    return (
      <ScrollView style={styles.detailContainer} contentContainerStyle={styles.detailContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedAssignment(null)}>
          <Text style={styles.backButtonText}>← Back to List</Text>
        </TouchableOpacity>

        <View style={styles.detailHeader}>
          <Pill label={selectedAssignment.status} />
          <Text style={styles.detailTitle}>{selectedAssignment.title}</Text>
          <Text style={styles.detailDueDate}>
            Due {new Date(selectedAssignment.dueDate).toLocaleDateString()}
          </Text>
          <Text style={styles.detailPoints}>
            {selectedAssignment.pointsPossible} points possible
          </Text>
        </View>

        <Text style={styles.detailLabel}>Description</Text>
        <Card style={styles.descriptionCard}>
          <Text style={styles.detailDescription}>{selectedAssignment.description}</Text>
        </Card>

        {isStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Submission</Text>
            {mySub ? (
              <Card style={styles.submissionCard}>
                <Text style={styles.submissionLabel}>Submitted Answer:</Text>
                <Text style={styles.submissionTextContent}>{mySub.content}</Text>

                {mySub.checkedByAI ? (
                  <View style={styles.aiFeedbackBlock}>
                    <Text style={styles.aiFeedbackTitle}>🤖 AI Grade & Feedback</Text>
                    <Text style={styles.aiScore}>
                      Score: {mySub.aiScore} / {selectedAssignment.pointsPossible}
                    </Text>
                    <Text style={styles.aiFeedback}>{mySub.aiFeedback}</Text>
                  </View>
                ) : (
                  <Text style={styles.pendingText}>⏳ Waiting for grading...</Text>
                )}

                {mySub.teacherScore !== undefined && mySub.teacherScore !== null && (
                  <View style={styles.teacherFeedbackBlock}>
                    <Text style={styles.teacherFeedbackTitle}>👨‍🏫 Teacher Feedback</Text>
                    <Text style={styles.teacherScore}>
                      Score: {mySub.teacherScore} / {selectedAssignment.pointsPossible}
                    </Text>
                    <Text style={styles.teacherFeedback}>{mySub.teacherFeedback}</Text>
                  </View>
                )}
              </Card>
            ) : (
              <Card style={styles.submissionForm}>
                <TextInput
                  style={styles.submissionInput}
                  multiline
                  numberOfLines={6}
                  placeholder="Type your response here..."
                  placeholderTextColor={colors.muted}
                  value={submissionContent}
                  onChangeText={setSubmissionContent}
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !submissionContent.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmission}
                  disabled={!submissionContent.trim() || isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Submit Work'}
                  </Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>
        )}

        {(isTeacher || isAdmin) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submissions ({submissions.length})</Text>
            {submissionsLoading ? (
              <ActivityIndicator color={colors.ai} style={styles.submissionsSpinner} />
            ) : (
              submissions.map((sub) => {
                const activeGradingState =
                  gradingState?.studentId === sub.studentId ? gradingState : null;
                return (
                  <Card key={sub.id} style={styles.submissionCard}>
                    <Text style={styles.studentName}>Student ID: {sub.studentId}</Text>
                    <Text style={styles.subContent}>{sub.content}</Text>

                    {sub.checkedByAI && (
                      <View style={styles.aiFeedbackBlockSmall}>
                        <Text style={styles.aiTitleSmall}>
                          AI Recommendation: {sub.aiScore} pts
                        </Text>
                        <Text style={styles.aiFeedbackSmall}>{sub.aiFeedback}</Text>
                      </View>
                    )}

                    {sub.teacherScore !== undefined && sub.teacherScore !== null ? (
                      <View style={styles.teacherFeedbackBlockSmall}>
                        <Text style={styles.teacherTitleSmall}>Graded: {sub.teacherScore} pts</Text>
                        <Text style={styles.teacherFeedbackSmall}>{sub.teacherFeedback}</Text>
                      </View>
                    ) : activeGradingState ? (
                      <View style={styles.gradingForm}>
                        <TextInput
                          style={styles.gradeInput}
                          keyboardType="numeric"
                          placeholder="Score"
                          placeholderTextColor={colors.muted}
                          value={activeGradingState.grade}
                          onChangeText={(t) =>
                            setGradingState((prev) => (prev ? { ...prev, grade: t } : null))
                          }
                        />
                        <TextInput
                          style={styles.feedbackInput}
                          placeholder="Feedback"
                          placeholderTextColor={colors.muted}
                          value={activeGradingState.feedback}
                          onChangeText={(t) =>
                            setGradingState((prev) => (prev ? { ...prev, feedback: t } : null))
                          }
                        />
                        <View style={styles.gradingFormActions}>
                          <TouchableOpacity
                            style={styles.publishButton}
                            onPress={() => handleGrade(sub.studentId)}
                            disabled={isGrading}
                          >
                            <Text style={styles.publishButtonText}>Publish</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setGradingState(null)}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.gradeButton}
                        onPress={() =>
                          setGradingState({
                            studentId: sub.studentId,
                            grade: sub.aiScore?.toString() || '',
                            feedback: '',
                          })
                        }
                      >
                        <Text style={styles.gradeButtonText}>Grade Submission</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.listContainer}>
      {classIds.length > 1 ? (
        <View style={styles.selectorWrapper}>
          <Text style={styles.selectorLabel}>Class:</Text>
          <SegmentedControl
            options={classOptions}
            selectedKey={selectedClass || ''}
            onSelect={(key) => setSelectedClass(key)}
            scrollable
          />
        </View>
      ) : null}

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.container}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshControl={
          <AppRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedAssignment(item)} activeOpacity={0.85}>
            <Card>
              <View style={styles.cardHeader}>
                <Pill label={item.status} />
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <Text style={styles.description} numberOfLines={3}>
                {item.description}
              </Text>
              <View style={styles.footer}>
                <Text style={styles.dueDate}>
                  Due {new Date(item.dueDate).toLocaleDateString()}
                </Text>
                <Text style={styles.points}>{item.pointsPossible} pts</Text>
              </View>
            </Card>
          </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  selectorLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardHeader: {
    marginBottom: 10,
  },
  container: {
    padding: 16,
    paddingBottom: 24,
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
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailContent: {
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.link,
    fontSize: 15,
    fontWeight: '700',
  },
  detailHeader: {
    marginBottom: 18,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  detailDueDate: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  detailPoints: {
    color: colors.ai,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descriptionCard: {
    marginBottom: 20,
  },
  detailDescription: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  submissionCard: {
    marginBottom: 16,
  },
  submissionsSpinner: {
    marginTop: 12,
  },
  submissionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  submissionTextContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  aiFeedbackBlock: {
    backgroundColor: colors.aiSoft,
    borderColor: colors.ai,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  aiFeedbackTitle: {
    color: colors.ai,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  aiScore: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  aiFeedback: {
    color: colors.whiteSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  pendingText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  teacherFeedbackBlock: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  teacherFeedbackTitle: {
    color: colors.link,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  teacherScore: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  teacherFeedback: {
    color: colors.whiteSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  submissionForm: {
    padding: 12,
  },
  submissionInput: {
    backgroundColor: '#091226',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 15,
    minHeight: 120,
    padding: 10,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.ai,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#07111f',
    fontSize: 15,
    fontWeight: '900',
  },
  studentName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  subContent: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  aiFeedbackBlockSmall: {
    backgroundColor: colors.aiSoft,
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  aiTitleSmall: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '800',
  },
  aiFeedbackSmall: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  teacherFeedbackBlockSmall: {
    backgroundColor: colors.primarySoft,
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  teacherTitleSmall: {
    color: colors.link,
    fontSize: 12,
    fontWeight: '800',
  },
  teacherFeedbackSmall: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  gradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  gradeButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  gradingForm: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  gradeInput: {
    backgroundColor: '#091226',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    minHeight: 36,
    paddingHorizontal: 8,
    marginBottom: 8,
    width: 80,
  },
  feedbackInput: {
    backgroundColor: '#091226',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    minHeight: 40,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  gradingFormActions: {
    flexDirection: 'row',
    gap: 8,
  },
  publishButton: {
    backgroundColor: colors.ai,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  publishButtonText: {
    color: '#07111f',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
});
