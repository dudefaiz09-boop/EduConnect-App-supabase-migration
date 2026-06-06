import React from 'react';
import { colors, spacing, radii, typography } from '@educonnect/design-tokens';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  style,
  disabled,
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.cardSoft,
          border: colors.border,
          color: colors.text,
        };
      case 'danger':
        return {
          bg: colors.dangerHover,
          border: 'transparent',
          color: colors.text,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          border: 'transparent',
          color: colors.muted,
        };
      case 'primary':
      default:
        return {
          bg: colors.primary,
          border: 'transparent',
          color: colors.text,
        };
    }
  };

  const currentColors = getColors();

  const buttonStyle: React.CSSProperties = {
    backgroundColor: disabled ? colors.card : currentColors.bg,
    border: `1px solid ${currentColors.border}`,
    borderRadius: `${radii.md}px`,
    color: disabled ? colors.muted : currentColors.color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: `${typography.fontSizes.md}px`,
    fontWeight: typography.fontWeights.semibold,
    opacity: disabled || isLoading ? 0.6 : 1,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    transition: 'all 0.2s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `${spacing.xs}px`,
    outline: 'none',
    ...style,
  };

  return (
    <button
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      style={buttonStyle}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ id, label, error, style, ...props }) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: `${spacing.xs}px`,
    marginBottom: `${spacing.md}px`,
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    color: error ? colors.danger : colors.muted,
    fontSize: `${typography.fontSizes.xs}px`,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.backgroundMuted,
    border: `1px solid ${error ? colors.danger : colors.border}`,
    borderRadius: `${radii.md}px`,
    color: colors.text,
    fontSize: `${typography.fontSizes.md}px`,
    outline: 'none',
    padding: `${spacing.md}px`,
    transition: 'border-color 0.15s ease-in-out',
    ...style,
  };

  const errorStyle: React.CSSProperties = {
    color: colors.danger,
    fontSize: `${typography.fontSizes.xs}px`,
    marginTop: `${spacing.xxs}px`,
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <input
        aria-describedby={errorId}
        aria-invalid={Boolean(error) || undefined}
        id={inputId}
        style={inputStyle}
        {...props}
      />
      {error && (
        <span id={errorId} style={errorStyle}>
          {error}
        </span>
      )}
    </div>
  );
};

// --- TABLE ---
interface TableProps {
  headers: string[];
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Table: React.FC<TableProps> = ({ headers, children, style }) => {
  const containerStyle: React.CSSProperties = {
    overflowX: 'auto',
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: `${radii.lg}px`,
    border: `1px solid ${colors.border}`,
    ...style,
  };

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    width: '100%',
    textAlign: 'left',
  };

  const thStyle: React.CSSProperties = {
    borderBottom: `1px solid ${colors.border}`,
    color: colors.muted,
    fontSize: `${typography.fontSizes.xs}px`,
    fontWeight: typography.fontWeights.semibold,
    padding: `${spacing.md}px`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

// --- CARD ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, style, ...props }) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: `${radii.lg}px`,
    padding: `${spacing.lg}px`,
    cursor: hoverable ? 'pointer' : undefined,
    transition: 'transform 0.2s, border-color 0.2s',
    ...style,
  };

  return (
    <div style={cardStyle} {...props}>
      {children}
    </div>
  );
};

// --- DIALOG ---
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  const titleId = React.useId();

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: `${spacing.lg}px`,
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: `${radii.xl}px`,
    maxWidth: '500px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: `1px solid ${colors.border}`,
    padding: `${spacing.lg}px`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    color: colors.text,
    fontSize: `${typography.fontSizes.xl}px`,
    fontWeight: typography.fontWeights.bold,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.muted,
    cursor: 'pointer',
    fontSize: `${typography.fontSizes.xl}px`,
  };

  const contentStyle: React.CSSProperties = {
    padding: `${spacing.lg}px`,
    color: colors.text,
  };

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
      style={overlayStyle}
      onClick={onClose}
    >
      <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 id={titleId} style={titleStyle}>
            {title}
          </h3>
          <button aria-label="Close dialog" style={closeButtonStyle} onClick={onClose}>
            &times;
          </button>
        </div>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
};

// --- EMPTY STATE ---
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.huge}px`,
    textAlign: 'center',
    border: `1px dashed ${colors.border}`,
    borderRadius: `${radii.lg}px`,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  };

  const titleStyle: React.CSSProperties = {
    color: colors.text,
    fontSize: `${typography.fontSizes.lg}px`,
    fontWeight: typography.fontWeights.bold,
    margin: `0 0 ${spacing.xs}px 0`,
  };

  const descStyle: React.CSSProperties = {
    color: colors.muted,
    fontSize: `${typography.fontSizes.sm}px`,
    margin: `0 0 ${spacing.lg}px 0`,
    maxWidth: '300px',
  };

  return (
    <div style={containerStyle}>
      <h4 style={titleStyle}>{title}</h4>
      <p style={descStyle}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// --- LOADING SKELETON ---
interface LoadingSkeletonProps {
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 3 }) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: `${spacing.md}px`,
    width: '100%',
  };

  const blockStyle = (width: string): React.CSSProperties => ({
    backgroundColor: colors.cardSoft,
    height: '20px',
    borderRadius: `${radii.sm}px`,
    width,
    animation: 'pulse 1.5s infinite ease-in-out',
  });

  return (
    <div style={containerStyle}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: `${spacing.xs}px` }}>
          <div style={blockStyle('40%')} />
          <div style={blockStyle('100%')} />
        </div>
      ))}
    </div>
  );
};

// --- TOAST ---
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: colors.successSoft,
          border: colors.successStrong,
          color: colors.success,
        };
      case 'error':
        return {
          bg: colors.dangerSoft,
          border: colors.dangerHover,
          color: colors.danger,
        };
      case 'info':
      default:
        return {
          bg: colors.primarySoft,
          border: colors.primary,
          color: colors.ai,
        };
    }
  };

  const tColors = getToastColors();

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `${spacing.xxl}px`,
    right: `${spacing.xxl}px`,
    backgroundColor: tColors.bg,
    border: `1px solid ${tColors.border}`,
    borderRadius: `${radii.md}px`,
    color: tColors.color,
    padding: `${spacing.md}px ${spacing.lg}px`,
    display: 'flex',
    alignItems: 'center',
    gap: `${spacing.md}px`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    zIndex: 2000,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontWeight: 'bold',
  };

  return (
    <div style={toastStyle}>
      <span>{message}</span>
      <button style={closeBtnStyle} onClick={onClose}>
        &times;
      </button>
    </div>
  );
};
