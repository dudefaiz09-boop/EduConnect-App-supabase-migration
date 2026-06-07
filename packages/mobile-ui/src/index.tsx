import React from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, radii, typography } from '@educonnect/design-tokens';

export type ModuleAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

// --- SCREEN SHELL ---
interface ScreenShellProps {
  title: string;
  subtitle?: string;
  scrollable?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  title,
  subtitle,
  scrollable = true,
  children,
  headerRight,
}) => {
  const Header = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {headerRight ? <View>{headerRight}</View> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.shellContainer}>
      <Header />
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.shellContentScroll}>{children}</ScrollView>
      ) : (
        <View style={styles.shellContentFlex}>{children}</View>
      )}
    </SafeAreaView>
  );
};

// --- LIST ROW ---
interface ListRowProps {
  title: string;
  description?: string;
  iconText?: string;
  iconBg?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  description,
  iconText,
  iconBg = colors.primarySoft,
  onPress,
  rightElement,
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container onPress={onPress} style={styles.rowContainer} activeOpacity={0.7}>
      {iconText ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Text style={styles.rowIconText}>{iconText.slice(0, 1).toUpperCase()}</Text>
        </View>
      ) : null}
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {rightElement ? <View>{rightElement}</View> : null}
    </Container>
  );
};

// --- MODULE CARD ---
interface ModuleCardProps {
  title: string;
  description: string;
  iconText: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  iconText,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.cardContainer, style]} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>{iconText.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );
};

// --- FORM FIELD ---
interface FormFieldProps {
  label?: string;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  style?: ViewStyle;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, style, ...props }) => {
  return (
    <View style={[styles.formFieldContainer, style]}>
      {label ? <Text style={styles.formFieldLabel}>{label}</Text> : null}
      <TextInput
        style={[styles.formFieldInput, error ? styles.formFieldInputError : null]}
        placeholderTextColor={colors.muted}
        {...props}
      />
      {error ? <Text style={styles.formFieldErrorText}>{error}</Text> : null}
    </View>
  );
};

// --- EMPTY STATE ---
interface EmptyStateProps {
  title: string;
  body: string;
  action?: ModuleAction;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, action }) => (
  <View
    accessibilityRole="summary"
    accessibilityLabel={`${title}. ${body}`}
    style={styles.emptyState}
  >
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
    {action ? (
      <TouchableOpacity
        accessibilityLabel={action.accessibilityLabel || action.label}
        accessibilityRole="button"
        onPress={action.onPress}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>{action.label}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

// --- LOADING STATE ---
interface LoadingStateProps {
  title?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ title = 'Loading module' }) => (
  <View accessibilityRole="progressbar" accessibilityLabel={title} style={styles.emptyState}>
    <ActivityIndicator color={colors.ai} />
    <Text style={styles.emptyBody}>{title}</Text>
  </View>
);

// --- MODULE ERROR STATE ---
interface ModuleErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ModuleErrorState: React.FC<ModuleErrorStateProps> = ({ message, onRetry }) => (
  <View
    accessibilityRole="alert"
    accessibilityLabel={`Could not load data. ${message}`}
    style={styles.emptyState}
  >
    <Text style={styles.moduleErrorTitle}>Could not load data</Text>
    <Text style={styles.emptyBody}>{message}</Text>
    <TouchableOpacity
      accessibilityLabel="Retry loading module data"
      accessibilityRole="button"
      style={styles.secondaryButton}
      onPress={onRetry}
    >
      <Text style={styles.secondaryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

// --- STAT CARD ---
export type StatTone = 'primary' | 'cyan' | 'green' | 'violet' | 'amber' | 'red';

interface StatCardProps {
  title: string;
  value: string;
  detail: string;
  tone?: StatTone;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, detail, tone = 'primary' }) => {
  const toneStyle =
    tone === 'green'
      ? styles.statIconGreen
      : tone === 'cyan'
        ? styles.statIconCyan
        : tone === 'violet'
          ? styles.statIconViolet
          : tone === 'amber'
            ? styles.statIconAmber
            : tone === 'red'
              ? styles.statIconRed
              : styles.statIconPrimary;

  return (
    <View
      accessibilityLabel={`${title}: ${value}. ${detail}`}
      accessibilityRole="summary"
      style={styles.statCard}
    >
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{title}</Text>
        <View style={[styles.statIcon, toneStyle]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statDetail}>{detail}</Text>
    </View>
  );
};

// --- MODULE HEADER ---
interface ModuleHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, subtitle, children }) => (
  <View style={styles.moduleHeader}>
    <View style={styles.moduleHeaderText}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
    {children}
  </View>
);

// --- CARD ---
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.moduleCardSurface, style]}>{children}</View>
);

// --- SEARCH INPUT ---
interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChangeText, placeholder }) => (
  <TextInput
    accessibilityLabel={placeholder}
    autoCapitalize="none"
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={colors.muted}
    style={styles.searchInput}
    value={value}
  />
);

// --- PILL ---
export type PillTone = 'blue' | 'green' | 'red' | 'amber' | 'violet';

interface PillProps {
  label: string;
  tone?: PillTone;
}

export const Pill: React.FC<PillProps> = ({ label, tone = 'blue' }) => {
  const style =
    tone === 'green'
      ? styles.pillGreen
      : tone === 'red'
        ? styles.pillRed
        : tone === 'amber'
          ? styles.pillAmber
          : tone === 'violet'
            ? styles.pillViolet
            : styles.pillBlue;

  return (
    <View accessibilityLabel={label} style={[styles.pill, style]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
};

// --- ACTION TILE ---
interface ActionTileProps {
  label: string;
  title: string;
  body: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  pillTone?: PillTone;
  accessibilityLabel?: string;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  label,
  title,
  body,
  onPress,
  style,
  pillTone,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    accessibilityLabel={accessibilityLabel || `${title}. ${body}`}
    accessibilityRole="button"
    activeOpacity={0.82}
    onPress={onPress}
    style={[styles.actionTile, style]}
  >
    <Pill label={label} tone={pillTone} />
    <Text style={styles.actionTileTitle}>{title}</Text>
    <Text style={styles.actionTileBody}>{body}</Text>
  </TouchableOpacity>
);

// --- BANNER ---
interface BannerProps {
  title: string;
  message?: string;
  type?: 'warning' | 'info' | 'error';
}

export const Banner: React.FC<BannerProps> = ({ title, message, type = 'info' }) => {
  const getBannerStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: colors.warningSoft,
          border: colors.warning,
        };
      case 'error':
        return {
          bg: colors.dangerSoft,
          border: colors.danger,
        };
      case 'info':
      default:
        return {
          bg: colors.primarySoft,
          border: colors.primary,
        };
    }
  };

  const bStyles = getBannerStyles();

  return (
    <View
      style={[
        styles.bannerContainer,
        { backgroundColor: bStyles.bg, borderBottomColor: bStyles.border },
      ]}
    >
      <Text style={styles.bannerTitle}>{title}</Text>
      {message ? <Text style={styles.bannerMessage}>{message}</Text> : null}
    </View>
  );
};

// --- BOTTOM TABS ---
interface TabItem {
  key: string;
  label: string;
}

interface BottomTabsProps {
  tabs: TabItem[];
  activeTabKey: string;
  onSelectTab: (key: string) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ tabs, activeTabKey, onSelectTab }) => {
  return (
    <View style={styles.bottomTabsContainer}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTabKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onSelectTab(tab.key)}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabButtonText, isActive ? styles.tabButtonTextActive : null]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// --- SEGMENTED CONTROL ---
interface SegmentedControlOption {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  scrollable?: boolean;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedKey,
  onSelect,
  scrollable = false,
}) => {
  const content = (
    <View style={styles.segmentRow}>
      {options.map((option) => {
        const isActive = selectedKey === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => onSelect(option.key)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroll}>
        {content}
      </ScrollView>
    );
  }

  return content;
};

// --- ERROR STATE ---
interface ErrorStateProps {
  error: Error;
  resetError: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, resetError }) => {
  return (
    <SafeAreaView style={styles.errorContainer}>
      <View style={styles.errorInner}>
        <Text style={styles.errorHeader}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error.message || 'An unexpected error occurred.'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={resetError}>
          <Text style={styles.errorButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- SHARED STYLE EXPORTS (plain objects, spread into local StyleSheet.create) ---
export const screenPadding = spacing.lg;
export const contentInset = spacing.lg;

export const sharedStyles = {
  flex: { flex: 1, backgroundColor: colors.background } as const,
  listContent: { padding: spacing.lg, paddingBottom: spacing.huge } as const,
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as const,
  cardPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as const,
  syncedText: {
    color: colors.muted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  } as const,
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: typography.fontWeights.black,
    marginBottom: 8,
  } as const,
  cardContent: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 21,
  } as const,
  cardDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
  } as const,
};

// --- STYLES ---
const styles = StyleSheet.create({
  shellContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  shellContentScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  shellContentFlex: {
    flex: 1,
    padding: spacing.lg,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowIconText: {
    color: colors.ai,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.lg,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  rowDescription: {
    color: colors.muted,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  cardContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardIconText: {
    color: colors.ai,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  cardDescription: {
    color: colors.muted,
    fontSize: typography.fontSizes.sm,
    lineHeight: 18,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: typography.fontSizes.md,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.black,
    textAlign: 'center',
  },
  moduleErrorTitle: {
    color: colors.danger,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.black,
    textAlign: 'center',
  },
  secondaryButton: {
    borderColor: '#4f8cff',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: '#8bb7ff',
    fontWeight: typography.fontWeights.bold,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    flexGrow: 1,
    marginBottom: spacing.md,
    minWidth: '47%',
    padding: spacing.lg,
  },
  statHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statIcon: {
    borderRadius: radii.lg,
    height: 28,
    width: 28,
  },
  statIconAmber: {
    backgroundColor: '#f59e0b',
  },
  statIconCyan: {
    backgroundColor: '#0ea5e9',
  },
  statIconGreen: {
    backgroundColor: colors.successStrong,
  },
  statIconPrimary: {
    backgroundColor: colors.primary,
  },
  statIconRed: {
    backgroundColor: '#ef4444',
  },
  statIconViolet: {
    backgroundColor: '#9333ea',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: typography.fontWeights.black,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: typography.fontWeights.black,
    marginTop: spacing.md,
  },
  statDetail: {
    color: colors.muted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.xs,
  },
  moduleHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  moduleHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSizes.display,
    fontWeight: typography.fontWeights.black,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  moduleCardSurface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 14,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    marginBottom: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillAmber: {
    backgroundColor: '#3b2b0c',
  },
  pillBlue: {
    backgroundColor: colors.primarySoft,
  },
  pillGreen: {
    backgroundColor: '#0c2f22',
  },
  pillRed: {
    backgroundColor: '#3a1117',
  },
  pillText: {
    color: colors.ai,
    fontSize: 10,
    fontWeight: typography.fontWeights.black,
    textTransform: 'uppercase',
  },
  pillViolet: {
    backgroundColor: '#25164d',
  },
  actionTile: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 138,
    padding: 14,
    width: '48%',
  },
  actionTileTitle: {
    color: colors.text,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.black,
  },
  actionTileBody: {
    color: colors.muted,
    fontSize: typography.fontSizes.sm,
    lineHeight: 19,
    marginTop: 6,
  },
  formFieldContainer: {
    marginBottom: spacing.md,
    width: '100%',
  },
  formFieldLabel: {
    color: colors.muted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  formFieldInput: {
    backgroundColor: '#091226',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.fontSizes.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  formFieldInputError: {
    borderColor: colors.danger,
  },
  formFieldErrorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.ai,
    borderRadius: radii.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    color: '#07111f',
    fontWeight: typography.fontWeights.black,
  },
  bannerContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  bannerTitle: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.sm,
  },
  bannerMessage: {
    color: colors.muted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xxs,
  },
  bottomTabsContainer: {
    backgroundColor: '#07101f',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    color: colors.muted,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.xs,
  },
  tabButtonTextActive: {
    color: colors.text,
  },
  segmentButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  segmentText: {
    color: colors.muted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.black,
  },
  segmentTextActive: {
    color: colors.text,
  },
  segmentScroll: {
    marginBottom: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorInner: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    width: '100%',
  },
  errorHeader: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  errorMessage: {
    fontSize: typography.fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  errorButtonText: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
});
