import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceRecord } from '@educonnect/shared';
import {
  assignmentsService,
  attendanceService,
  feesService,
  libraryService,
  performanceService,
  studentsService,
} from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { colors, formatCurrency } from '../theme';
import {
  AppRefreshControl,
  Card,
  EmptyState,
  errorMessage,
  LoadingState,
  ModuleErrorState as ErrorState,
  ModuleHeader,
  Pill,
  SearchInput,
  SegmentedControl,
  StatCard,
  sharedStyles,
} from '@educonnect/mobile-ui';

type FeeRecord = {
  id: string;
  studentId: string;
  amountDue: number;
  amountPaid?: number;
  dueDate?: string;
  status?: 'pending' | 'paid' | 'partial';
};

type PaymentRecord = {
  id: string;
  feeId: string;
  amount: number;
  paidAt?: string;
  method?: string;
  receiptUrl?: string;
};

type FeeAccountResponse = {
  fees?: FeeRecord[];
  payments?: PaymentRecord[];
};

type FeeReport = {
  totalPaid: number;
  pending: number;
  totalDue: number;
  records: FeeRecord[];
};

type LibraryResource = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  grade?: string;
  type?: string;
  tags?: string[];
  fileUrl?: string;
  externalUrl?: string;
};

type BorrowRecord = {
  id: string;
  resourceId: string;
  studentName?: string;
  borrowedAt?: string;
  dueAt?: string;
  status?: 'borrowed' | 'returned';
};

type BorrowDueState = {
  label: string;
  tone: 'green' | 'amber' | 'red';
};

type PerformanceRecord = {
  id: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
  studentId?: string;
};

type PerformanceReport = {
  classAverage: number;
  topSubject: string;
  globalRank?: number;
  records: PerformanceRecord[];
};

type StudentProfile = {
  uid: string;
  displayName?: string;
  email?: string;
  classId?: string;
  section?: string;
};

type ParentAssignmentSummary = {
  id: string;
  title: string;
  dueDate?: string;
};

type ParentSubmissionSummary = {
  id: string;
  assignmentId?: string;
  status?: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveClassId(primaryClassId: string | null, availableClassIds: string[]) {
  return primaryClassId || availableClassIds[0] || '';
}

function getBorrowDueState(record?: BorrowRecord): BorrowDueState | null {
  if (!record || record.status !== 'borrowed') return null;

  const dueAt = parseDate(record.dueAt);
  if (!dueAt) return { label: 'Borrowed', tone: 'amber' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueAt);
  dueDate.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return {
      label: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
      tone: 'red',
    };
  }

  if (daysUntilDue === 0) return { label: 'Due today', tone: 'amber' };
  if (daysUntilDue <= 2) return { label: `Due in ${daysUntilDue} days`, tone: 'amber' };

  return { label: `Due in ${daysUntilDue} days`, tone: 'green' };
}

function loadParentAssignments(classId: string) {
  const assignments = assignmentsService.getAssignments(classId);
  return assignments as unknown as Promise<ParentAssignmentSummary[]>;
}

function loadParentSubmissions(studentId: string) {
  const submissions = assignmentsService.getMyHistory(studentId);
  return submissions as unknown as Promise<ParentSubmissionSummary[]>;
}

function useApiData<T>(key: unknown[], loader: () => Promise<T>, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: loader,
    enabled,
    retry: 1,
  });
}

// ─── Attendance status config (mirrors web ATTENDANCE_STATUS_UI) ─────────────
const ATTENDANCE_STATUS: {
  id: 'present' | 'absent' | 'late';
  label: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  { id: 'present', label: 'Present', color: '#10b981', bg: '#064e3b', border: '#10b981' },
  { id: 'absent', label: 'Absent', color: '#f87171', bg: '#2a1218', border: '#f87171' },
  { id: 'late', label: 'Late', color: '#fbbf24', bg: '#2a210f', border: '#fbbf24' },
];

type AttendanceTab = 'mark' | 'history' | 'reports';

export function AttendanceScreen() {
  const { user, canManageAttendance, classId, classIds } = useAuth();

  // Role-gated default tab: teachers/admins start on Mark, students on History
  const [tab, setTab] = useState<AttendanceTab>(canManageAttendance ? 'mark' : 'history');

  // Shared state
  const [selectedClass, setSelectedClass] = useState(() => resolveClassId(classId, classIds));
  const [selectedDate] = useState(todayIso());
  const [search, setSearch] = useState('');

  // Mark tab state
  const [markings, setMarkings] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Tab options (students only see History) ───────────────────────────────
  const tabOptions = useMemo(() => {
    if (canManageAttendance) {
      return [
        { key: 'mark', label: 'Mark' },
        { key: 'history', label: 'History' },
        { key: 'reports', label: 'Reports' },
      ];
    }
    return [{ key: 'history', label: 'History' }];
  }, [canManageAttendance]);

  // ── Data queries ──────────────────────────────────────────────────────────
  // Students list for Mark tab (only teachers/admins)
  const studentsQuery = useApiData<StudentProfile[]>(
    ['mobile-attendance-students', selectedClass],
    () => studentsService.listByClass(selectedClass) as Promise<StudentProfile[]>,
    canManageAttendance && Boolean(selectedClass) && tab === 'mark'
  );

  // Existing records for Mark tab (pre-populate markings)
  const existingQuery = useApiData<AttendanceRecord[]>(
    ['mobile-attendance-existing', selectedClass, selectedDate],
    () => attendanceService.list(selectedClass, selectedDate) as Promise<AttendanceRecord[]>,
    canManageAttendance && Boolean(selectedClass) && tab === 'mark'
  );

  const existingRecords = useMemo(() => existingQuery.data || [], [existingQuery.data]);
  const existingMarkings = useMemo(() => {
    const map: Record<string, 'present' | 'absent' | 'late'> = {};
    existingRecords.forEach((record) => {
      map[record.studentId] = record.status as 'present' | 'absent' | 'late';
    });
    return map;
  }, [existingRecords]);
  const attendanceMarkings = useMemo(
    () => ({ ...existingMarkings, ...markings }),
    [existingMarkings, markings]
  );

  // History for current user (or student tab)
  const historyQuery = useApiData<AttendanceRecord[]>(
    ['mobile-attendance-history', user?.uid],
    () => attendanceService.history(user!.uid) as Promise<AttendanceRecord[]>,
    Boolean(user?.uid) && tab === 'history'
  );

  // Reports (class-level summary)
  const reportsQuery = useApiData<{ date: string; attendanceRate: number }[]>(
    ['mobile-attendance-report', selectedClass],
    () =>
      attendanceService.report(selectedClass) as Promise<
        { date: string; attendanceRate: number }[]
      >,
    canManageAttendance && Boolean(selectedClass) && tab === 'reports'
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const students = useMemo(() => studentsQuery.data || [], [studentsQuery.data]);
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        (s.displayName || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const markSummary = useMemo(() => {
    let present = 0,
      absent = 0,
      late = 0;
    students.forEach((s) => {
      const status = attendanceMarkings[s.uid] || 'absent';
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else absent++;
    });
    return { present, absent, late };
  }, [students, attendanceMarkings]);

  const historySummary = useMemo(() => {
    const records = historyQuery.data || [];
    return {
      present: records.filter((r) => r.status === 'present').length,
      late: records.filter((r) => r.status === 'late').length,
      absent: records.filter((r) => r.status === 'absent').length,
    };
  }, [historyQuery.data]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markStudent = useCallback(
    (uid: string, status: 'present' | 'absent' | 'late') =>
      setMarkings((prev) => ({ ...prev, [uid]: status })),
    []
  );

  const markAllPresent = useCallback(() => {
    const next: Record<string, 'present' | 'absent' | 'late'> = {};
    students.forEach((s) => {
      next[s.uid] = attendanceMarkings[s.uid] || 'present';
    });
    setMarkings((prev) => ({ ...prev, ...next }));
  }, [students, attendanceMarkings]);

  const saveAttendance = useCallback(async () => {
    if (!selectedClass || students.length === 0) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const records = students.map((s) => ({
        studentId: s.uid,
        studentName: s.displayName || '',
        status: attendanceMarkings[s.uid] || 'absent',
      }));
      await attendanceService.mark(
        { classId: selectedClass, date: selectedDate, records },
        `attendance-${selectedClass}-${selectedDate}`
      );
      setSaveSuccess(true);
      void existingQuery.refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [selectedClass, selectedDate, students, attendanceMarkings, existingQuery]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Attendance"
        subtitle={
          canManageAttendance
            ? 'Mark daily attendance, view history, and run class reports.'
            : 'Your attendance history and current status.'
        }
      />

      {/* Tab selector */}
      <SegmentedControl
        options={tabOptions}
        selectedKey={tab}
        onSelect={(key) => setTab(key as AttendanceTab)}
      />

      {/* ─── MARK TAB ─────────────────────────────────────────────────────── */}
      {tab === 'mark' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Stat summary row */}
          <View style={sharedStyles.statGrid}>
            <StatCard
              title="Present"
              value={String(markSummary.present)}
              detail="Marked"
              tone="green"
            />
            <StatCard
              title="Late"
              value={String(markSummary.late)}
              detail="Follow-up"
              tone="amber"
            />
            <StatCard
              title="Absent"
              value={String(markSummary.absent)}
              detail="Unmarked"
              tone="red"
            />
          </View>

          {/* Filters row: class selector + date */}
          <View style={attStyles.filtersRow}>
            {classIds.length > 1 && (
              <View style={[attStyles.filterChip, attStyles.filterChipGrow]}>
                <Text style={attStyles.filterLabel}>Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {classIds.map((cid) => (
                    <TouchableOpacity
                      key={cid}
                      onPress={() => setSelectedClass(cid)}
                      style={[
                        attStyles.classChip,
                        selectedClass === cid && attStyles.classChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          attStyles.classChipText,
                          selectedClass === cid && attStyles.classChipTextActive,
                        ]}
                      >
                        Class {cid}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={attStyles.filterChip}>
              <Text style={attStyles.filterLabel}>Date</Text>
              <Text style={attStyles.dateText}>{selectedDate}</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={attStyles.searchWrap}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search students…"
              placeholderTextColor="#475569"
              style={attStyles.searchInput}
            />
          </View>

          {/* Student list */}
          {studentsQuery.isLoading || existingQuery.isLoading ? (
            <LoadingState title="Loading students…" />
          ) : studentsQuery.isError ? (
            <ErrorState
              message={errorMessage(studentsQuery.error, 'Could not load students.')}
              onRetry={() => void studentsQuery.refetch()}
            />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              title="No students found"
              body="Assign students to this class first, or adjust your search."
              action={{ label: 'Refresh', onPress: () => void studentsQuery.refetch() }}
            />
          ) : (
            <View style={attStyles.studentListWrap}>
              {/* Header row */}
              <View style={attStyles.listHeaderRow}>
                <Text style={attStyles.listHeaderText}>
                  Mark Attendance
                  <Text style={attStyles.countBadge}> {filteredStudents.length} students</Text>
                </Text>
                <TouchableOpacity onPress={markAllPresent} style={attStyles.markAllBtn}>
                  <Text style={attStyles.markAllText}>Mark All Present</Text>
                </TouchableOpacity>
              </View>

              {filteredStudents.map((s) => (
                <View key={s.uid} style={attStyles.studentRow}>
                  {/* Avatar */}
                  <View style={attStyles.avatar}>
                    <Text style={attStyles.avatarText}>
                      {(s.displayName || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  {/* Name + email */}
                  <View style={attStyles.studentInfo}>
                    <Text style={attStyles.studentName}>{s.displayName || 'Unnamed Student'}</Text>
                    {Boolean(s.email) && <Text style={attStyles.studentEmail}>{s.email}</Text>}
                  </View>
                  {/* Status toggles */}
                  <View style={attStyles.statusRow}>
                    {ATTENDANCE_STATUS.map((opt) => {
                      const isSelected = attendanceMarkings[s.uid] === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => markStudent(s.uid, opt.id)}
                          style={[
                            attStyles.statusBtn,
                            isSelected && {
                              backgroundColor: opt.bg,
                              borderColor: opt.color,
                            },
                          ]}
                        >
                          <Text
                            style={[attStyles.statusBtnText, isSelected && { color: opt.color }]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Save feedback */}
          {saveError.length > 0 && (
            <View style={attStyles.errorBanner}>
              <Text style={attStyles.errorBannerText}>{saveError}</Text>
            </View>
          )}
          {saveSuccess && (
            <View style={attStyles.successBanner}>
              <Text style={attStyles.successBannerText}>Attendance saved successfully!</Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            onPress={() => void saveAttendance()}
            disabled={saving || students.length === 0}
            style={[
              attStyles.saveBtn,
              (saving || students.length === 0) && attStyles.saveBtnDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={attStyles.saveBtnText}>Save Daily Record</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── HISTORY TAB ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          {/* Summary stats */}
          <View style={sharedStyles.statGrid}>
            <StatCard
              title="Present"
              value={String(historySummary.present)}
              detail="All time"
              tone="green"
            />
            <StatCard
              title="Late"
              value={String(historySummary.late)}
              detail="All time"
              tone="amber"
            />
            <StatCard
              title="Absent"
              value={String(historySummary.absent)}
              detail="All time"
              tone="red"
            />
          </View>
          {historyQuery.isLoading ? (
            <LoadingState title="Loading history…" />
          ) : historyQuery.isError ? (
            <ErrorState
              message={errorMessage(historyQuery.error, 'Attendance history unavailable.')}
              onRetry={() => void historyQuery.refetch()}
            />
          ) : (
            <FlatList
              data={historyQuery.data || []}
              keyExtractor={(item, index) =>
                item.id || `hist-${item.studentId}-${item.date}-${index}`
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  title="No attendance history"
                  body="Records will appear here once attendance has been marked."
                  action={{ label: 'Refresh', onPress: () => void historyQuery.refetch() }}
                />
              }
              refreshControl={
                <AppRefreshControl
                  refreshing={historyQuery.isRefetching}
                  onRefresh={() => void historyQuery.refetch()}
                />
              }
              renderItem={({ item }) => {
                const statusCfg = ATTENDANCE_STATUS.find((s) => s.id === item.status);
                return (
                  <Card>
                    <View style={attStyles.historyCardRow}>
                      <View>
                        <Text style={sharedStyles.cardTitle}>{item.date || '—'}</Text>
                        <Text style={sharedStyles.cardContent}>
                          Class {item.classId || selectedClass || 'N/A'}
                        </Text>
                      </View>
                      <View
                        style={[
                          attStyles.statusPill,
                          statusCfg && {
                            backgroundColor: statusCfg.bg,
                            borderColor: statusCfg.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            attStyles.statusPillText,
                            statusCfg && { color: statusCfg.color },
                          ]}
                        >
                          {item.status?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              }}
            />
          )}
        </>
      )}

      {/* ─── REPORTS TAB ──────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {reportsQuery.isLoading ? (
            <LoadingState title="Loading reports…" />
          ) : reportsQuery.isError ? (
            <ErrorState
              message={errorMessage(reportsQuery.error, 'Reports unavailable.')}
              onRetry={() => void reportsQuery.refetch()}
            />
          ) : (
            <>
              {/* Class + date selector for reports */}
              {classIds.length > 1 && (
                <View style={attStyles.filtersRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {classIds.map((cid) => (
                      <TouchableOpacity
                        key={cid}
                        onPress={() => setSelectedClass(cid)}
                        style={[
                          attStyles.classChip,
                          selectedClass === cid && attStyles.classChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            attStyles.classChipText,
                            selectedClass === cid && attStyles.classChipTextActive,
                          ]}
                        >
                          Class {cid}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Summary card */}
              <View style={attStyles.reportSummaryCard}>
                <Text style={attStyles.reportSummaryLabel}>Overall Average</Text>
                {(() => {
                  const data = reportsQuery.data || [];
                  const avg =
                    data.length > 0
                      ? Math.round(
                          (data.reduce((sum, r) => sum + (r.attendanceRate || 0), 0) /
                            data.length) *
                            100
                        )
                      : 0;
                  return (
                    <>
                      <Text style={attStyles.reportSummaryValue}>{avg}%</Text>
                      <Text style={attStyles.reportSummarySubtext}>
                        Based on {data.length} day{data.length !== 1 ? 's' : ''} of records for
                        Class {selectedClass}
                      </Text>
                    </>
                  );
                })()}
              </View>

              {/* Daily rows */}
              {(reportsQuery.data || []).length === 0 ? (
                <EmptyState
                  title="No report data"
                  body="Reports populate once attendance has been marked for this class."
                  action={{ label: 'Refresh', onPress: () => void reportsQuery.refetch() }}
                />
              ) : (
                (reportsQuery.data || []).map((entry, index) => {
                  const pct = Math.round((entry.attendanceRate || 0) * 100);
                  const toneColor = pct >= 90 ? '#10b981' : pct >= 75 ? '#fbbf24' : '#f87171';
                  return (
                    <View key={`report-${index}`} style={attStyles.reportRow}>
                      <Text style={attStyles.reportDate}>{entry.date}</Text>
                      <View style={attStyles.reportBarTrack}>
                        <View
                          style={[
                            attStyles.reportBarFill,
                            { width: `${pct}%`, backgroundColor: toneColor },
                          ]}
                        />
                      </View>
                      <Text style={[attStyles.reportPct, { color: toneColor }]}>{pct}%</Text>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export function FeesScreen() {
  const { user, isStudent, canManageFees, classId, classIds } = useAuth();
  const selectedClass = resolveClassId(classId, classIds);
  const query = useApiData<FeeAccountResponse | FeeReport>(
    ['mobile-fees', user?.uid, isStudent, canManageFees, selectedClass],
    () =>
      isStudent
        ? (feesService.getStudentAccount(user!.uid) as Promise<FeeAccountResponse>)
        : (feesService.getClassReport(selectedClass) as Promise<FeeReport>),
    Boolean(user?.uid) && (isStudent || (canManageFees && Boolean(selectedClass)))
  );

  const account = query.data as FeeAccountResponse | undefined;
  const report = query.data as FeeReport | undefined;
  const fees = isStudent ? account?.fees || [] : report?.records || [];
  const paid = isStudent
    ? fees.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0)
    : Number(report?.totalPaid || 0);
  const due = isStudent
    ? fees.reduce(
        (sum, item) =>
          sum + Math.max(Number(item.amountDue || 0) - Number(item.amountPaid || 0), 0),
        0
      )
    : Number(report?.pending || 0);

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Financial Management"
        subtitle={
          isStudent
            ? 'Your fee status and payment history.'
            : 'Read-only mobile fee summaries for permitted finance roles.'
        }
      />
      {!isStudent && !canManageFees ? (
        <EmptyState
          title="Fees unavailable"
          body="Your role can view this module only when fee access is granted."
        />
      ) : query.isLoading ? (
        <LoadingState title="Loading fee records" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Fee records are temporarily unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={fees}
          keyExtractor={(item, index) => item.id || `${item.studentId}-${index}`}
          ListHeaderComponent={
            <View style={sharedStyles.statGrid}>
              <StatCard
                title="Paid"
                value={formatCurrency(paid)}
                detail="Recorded payments"
                tone="green"
              />
              <StatCard title="Due" value={formatCurrency(due)} detail="Outstanding" tone="red" />
            </View>
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No fee records"
              body="Fee entries will appear after accounts publishes them."
              action={{ label: 'Refresh fees', onPress: () => void query.refetch() }}
            />
          }
          refreshControl={
            <AppRefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill
                label={item.status || 'pending'}
                tone={item.status === 'paid' ? 'green' : 'amber'}
              />
              <Text style={sharedStyles.cardTitle}>{formatCurrency(item.amountDue || 0)}</Text>
              <Text style={sharedStyles.cardContent}>
                Paid {formatCurrency(item.amountPaid || 0)}
              </Text>
              <Text style={sharedStyles.cardDate}>
                Due {item.dueDate || 'not set'} - Student {item.studentId}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function LibraryScreen() {
  const { user, isStudent, canManageLibrary } = useAuth();
  const [queryText, setQueryText] = useState('');
  const resourcesQuery = useApiData<LibraryResource[]>(
    ['mobile-library-resources'],
    () => libraryService.resources() as Promise<LibraryResource[]>
  );
  const historyQuery = useApiData<BorrowRecord[]>(
    ['mobile-library-history', user?.uid],
    () => libraryService.borrowHistory(user!.uid) as Promise<BorrowRecord[]>,
    Boolean(user?.uid && isStudent)
  );
  const resources = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return (resourcesQuery.data || []).filter((resource) => {
      if (!normalized) return true;
      return `${resource.title || ''} ${resource.subject || ''} ${(resource.tags || []).join(' ')}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [queryText, resourcesQuery.data]);
  const activeBorrows = (historyQuery.data || []).filter((item) => item.status === 'borrowed');
  const overdueBorrows = activeBorrows.filter((item) => getBorrowDueState(item)?.tone === 'red');

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Academic Library"
        subtitle="Digital resources, subjects, and borrowing status."
      >
        {canManageLibrary && <Pill label="manager" tone="violet" />}
      </ModuleHeader>
      <SearchInput
        value={queryText}
        onChangeText={setQueryText}
        placeholder="Search title, subject, or tag"
      />
      {resourcesQuery.isLoading ? (
        <LoadingState title="Loading library catalog" />
      ) : resourcesQuery.isError ? (
        <ErrorState
          message={errorMessage(resourcesQuery.error, 'Library resources are unavailable.')}
          onRetry={() => void resourcesQuery.refetch()}
        />
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={sharedStyles.statGrid}>
              <StatCard
                title="Catalog"
                value={String(resourcesQuery.data?.length || 0)}
                detail="Resources"
              />
              <StatCard
                title="Borrowed"
                value={String(activeBorrows.length)}
                detail="Active checkouts"
                tone="amber"
              />
              <StatCard
                title="Overdue"
                value={String(overdueBorrows.length)}
                detail="Needs return"
                tone="red"
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No resources found"
              body="Try another search or refresh the catalog."
              action={
                queryText
                  ? { label: 'Clear search', onPress: () => setQueryText('') }
                  : { label: 'Refresh catalog', onPress: () => void resourcesQuery.refetch() }
              }
            />
          }
          refreshControl={
            <AppRefreshControl
              refreshing={resourcesQuery.isRefetching || historyQuery.isRefetching}
              onRefresh={() => {
                void resourcesQuery.refetch();
                void historyQuery.refetch();
              }}
            />
          }
          renderItem={({ item }) => {
            const borrow = activeBorrows.find((record) => record.resourceId === item.id);
            const dueState = getBorrowDueState(borrow);

            return (
              <Card>
                <View style={styles.cardPillRow}>
                  <Pill label={item.subject || item.type || 'resource'} />
                  {dueState && <Pill label={dueState.label} tone={dueState.tone} />}
                </View>
                <Text style={sharedStyles.cardTitle}>{item.title}</Text>
                <Text style={sharedStyles.cardContent}>
                  {item.description || 'No description provided.'}
                </Text>
                <Text style={sharedStyles.cardDate}>
                  Grade {item.grade || 'All'} -{' '}
                  {(item.tags || []).slice(0, 3).join(', ') || 'No tags'}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

export function PerformanceScreen() {
  const { user, isStudent, canManagePerformance, classId, classIds } = useAuth();
  const selectedClass = resolveClassId(classId, classIds);
  const query = useApiData<PerformanceRecord[] | PerformanceReport>(
    ['mobile-performance', user?.uid, isStudent, selectedClass],
    () =>
      isStudent
        ? (performanceService.student(user!.uid) as Promise<PerformanceRecord[]>)
        : (performanceService.report(selectedClass) as Promise<PerformanceReport>),
    Boolean(user?.uid) && (isStudent || (canManagePerformance && Boolean(selectedClass)))
  );
  const report = query.data as PerformanceReport | undefined;
  const records = isStudent ? ((query.data || []) as PerformanceRecord[]) : report?.records || [];
  const average =
    records.length > 0
      ? Math.round(records.reduce((sum, item) => sum + Number(item.score || 0), 0) / records.length)
      : Math.round(report?.classAverage || 0);
  const topScore = Math.max(...records.map((item) => Number(item.score || 0)), 0);

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Performance Analytics"
        subtitle="Academic records and mobile-safe score summaries."
      />
      {!isStudent && !canManagePerformance ? (
        <EmptyState
          title="Performance unavailable"
          body="Your role needs reporting access for this module."
        />
      ) : query.isLoading ? (
        <LoadingState title="Loading performance records" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Performance records are unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item.id || `${item.studentId}-${item.subject}-${index}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={sharedStyles.statGrid}>
              <StatCard
                title="Average"
                value={`${average}%`}
                detail="Loaded records"
                tone="violet"
              />
              <StatCard
                title="Top"
                value={`${topScore}%`}
                detail={report?.topSubject || 'Best score'}
                tone="green"
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No performance records"
              body="Scores will appear after they are uploaded."
              action={{ label: 'Refresh scores', onPress: () => void query.refetch() }}
            />
          }
          refreshControl={
            <AppRefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill
                label={item.grade || 'score'}
                tone={
                  Number(item.score) >= 80 ? 'green' : Number(item.score) >= 60 ? 'amber' : 'red'
                }
              />
              <Text style={sharedStyles.cardTitle}>{item.subject}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(Math.max(Number(item.score || 0), 0), 100)}%` },
                  ]}
                />
              </View>
              <Text style={sharedStyles.cardContent}>
                {item.score}% - {item.term}
              </Text>
              {!isStudent && <Text style={sharedStyles.cardDate}>Student {item.studentId}</Text>}
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function ParentPortalScreen() {
  const { role, linkedStudentIds } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(linkedStudentIds[0] || '');

  const query = useApiData(
    ['mobile-parent-portal', selectedStudentId],
    async () => {
      const profileResponse = (await studentsService.getProfile(selectedStudentId)) as
        | StudentProfile
        | { data?: StudentProfile };

      const profile = (
        'data' in profileResponse && profileResponse.data ? profileResponse.data : profileResponse
      ) as StudentProfile;
      const assignmentRequest = profile.classId
        ? loadParentAssignments(profile.classId)
        : Promise.resolve<ParentAssignmentSummary[]>([]);

      const [attendance, fees, performance, assignments, submissions] = await Promise.all([
        attendanceService.history(selectedStudentId) as Promise<AttendanceRecord[]>,
        feesService.getStudentAccount(selectedStudentId) as Promise<FeeAccountResponse>,
        performanceService.student(selectedStudentId) as Promise<PerformanceRecord[]>,
        assignmentRequest,
        loadParentSubmissions(selectedStudentId),
      ]);
      return { profile, attendance, fees, performance, assignments, submissions };
    },
    Boolean(selectedStudentId)
  );

  const data = query.data;
  const attendanceRate = data?.attendance?.length
    ? Math.round(
        (data.attendance.filter((item) => item.status === 'present').length /
          data.attendance.length) *
          100
      )
    : 0;
  const avgScore = data?.performance?.length
    ? Math.round(
        data.performance.reduce((sum, item) => sum + Number(item.score || 0), 0) /
          data.performance.length
      )
    : 0;
  const pendingFees =
    data?.fees?.fees?.reduce(
      (sum, fee) => sum + Math.max(Number(fee.amountDue || 0) - Number(fee.amountPaid || 0), 0),
      0
    ) || 0;
  const pendingAssignments =
    data?.assignments?.length && data.submissions
      ? Math.max(data.assignments.length - data.submissions.length, 0)
      : 0;

  if (role === 'admin') {
    return (
      <ScrollView contentContainerStyle={styles.listContent}>
        <ModuleHeader
          title="Parent Portal"
          subtitle="Child-specific academic and finance summaries."
        />
        <EmptyState
          title="Admin view"
          body="Parent Portal is optimized for parent accounts. Use Students to manage student-parent links."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={
        <AppRefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
    >
      <ModuleHeader
        title="Parent Portal"
        subtitle="Linked children, attendance, assignments, fees, and grades."
      />
      {linkedStudentIds.length > 1 && (
        <SegmentedControl
          options={linkedStudentIds.map((id, idx) => ({ key: id, label: `Student ${idx + 1}` }))}
          selectedKey={selectedStudentId}
          onSelect={setSelectedStudentId}
          scrollable
        />
      )}
      {!selectedStudentId ? (
        <EmptyState
          title="No students linked"
          body="Ask the school administration to link your parent account."
        />
      ) : query.isLoading ? (
        <LoadingState title="Syncing dependent records" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Parent portal data is unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Card style={styles.profileCard}>
            <Pill label="student profile" />
            <Text style={styles.heroName}>{data?.profile?.displayName || selectedStudentId}</Text>
            <Text style={sharedStyles.cardContent}>
              Class {data?.profile?.classId || 'N/A'} - Section {data?.profile?.section || 'N/A'}
            </Text>
          </Card>
          <View style={sharedStyles.statGrid}>
            <StatCard
              title="Attendance"
              value={`${attendanceRate}%`}
              detail="Present rate"
              tone="green"
            />
            <StatCard title="Average" value={`${avgScore}%`} detail="Performance" tone="violet" />
            <StatCard
              title="Pending"
              value={String(pendingAssignments)}
              detail="Assignments"
              tone="amber"
            />
            <StatCard
              title="Fees Due"
              value={formatCurrency(pendingFees)}
              detail="Outstanding"
              tone="red"
            />
          </View>
          <Card>
            <Text style={sharedStyles.cardTitle}>Recent attendance</Text>
            {(data?.attendance || []).slice(0, 5).map((item) => (
              <Text key={item.id || `${item.date}-${item.studentId}`} style={styles.rowText}>
                {item.date}: {item.status}
              </Text>
            ))}
            {(data?.attendance || []).length === 0 && (
              <Text style={sharedStyles.cardContent}>No attendance records are available yet.</Text>
            )}
          </Card>
          <Card>
            <Text style={sharedStyles.cardTitle}>Academic workflow</Text>
            {(data?.assignments || []).slice(0, 5).map((item) => (
              <Text key={item.id} style={styles.rowText}>
                {item.title} - due {item.dueDate}
              </Text>
            ))}
            {(data?.assignments || []).length === 0 && (
              <Text style={sharedStyles.cardContent}>
                No assignments are available for this child.
              </Text>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

export function PlaceholderApiScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      <ModuleHeader title={title} subtitle={subtitle} />
      <EmptyState
        title="Coming soon on mobile"
        body="This module is available on the web dashboard. Mobile support is being built."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  flex: {
    flex: 1,
  },
  heroName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: colors.profileCardBg,
    borderColor: colors.profileCardBorder,
  },
  progressFill: {
    backgroundColor: colors.progressFill,
    borderRadius: 999,
    height: 10,
  },
  progressTrack: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    height: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  rowText: {
    color: colors.whiteSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
});

// ─── Attendance-specific styles ───────────────────────────────────────────────
const attStyles = StyleSheet.create({
  // Filters row
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  filterChipGrow: {
    flex: 1,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dateText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  // Class chips
  classChip: {
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  classChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  classChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  classChipTextActive: {
    color: colors.link,
  },

  // Search
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  // Student list
  studentListWrap: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  listHeaderRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeaderText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  countBadge: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  markAllBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: colors.link,
    fontSize: 12,
    fontWeight: '700',
  },

  // Student row
  studentRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.cardSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  studentEmail: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBtn: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBtnText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  // Save button
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  // Feedback banners
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  successBannerText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },

  // History card
  historyCardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Reports tab
  reportSummaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
  },
  reportSummaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  reportSummaryValue: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 4,
  },
  reportSummarySubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  reportRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  reportDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  reportBarTrack: {
    backgroundColor: colors.cardSoft,
    borderRadius: 6,
    flex: 1,
    height: 10,
    overflow: 'hidden',
  },
  reportBarFill: {
    borderRadius: 6,
    height: 10,
  },
  reportPct: {
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
});
