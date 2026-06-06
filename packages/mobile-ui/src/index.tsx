import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, spacing, radii, typography } from '@educonnect/design-tokens';

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
