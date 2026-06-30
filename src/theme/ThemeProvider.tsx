import React, { createContext, useContext, useMemo } from 'react';

// ==========================================
// 1. Theme Interface & Type Definitions
// ==========================================

export interface ThemeColors {
  primary: string;        // Saffron Gold (#F5C518)
  warning: string;        // Danger Red (#F04452)
  background: string;     // Surface White (#FFFFFF)
  textNearBlack: string;  // Ink-900 (#191F28)
  textGray: string;       // Ink-600 (#4E5968)
  border: string;         // Delicate divider (#E5E8EB)
}

export interface ThemeSpacing {
  s8: number;   // 8px Spacing
  s16: number;  // 16px Spacing
  s24: number;  // 24px Spacing
  s32: number;  // 32px Spacing
  s40: number;  // 40px Spacing
}

export interface FontStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  color: string;
}

export interface ThemeTypography {
  h1: FontStyle;      // Page Headlines
  h2: FontStyle;      // Section Titles
  h3: FontStyle;      // Component Titles
  body: FontStyle;    // Standard reading text
  caption: FontStyle; // Small details
}

export interface AppTheme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    pill: string;
  };
}

// ==========================================
// 2. Production Palette & Values Config (Web)
// ==========================================
// Single source of truth = CSS custom properties in src/index.css (:root).
// These reference the same tokens so the React theme and the stylesheet never drift apart.

const defaultColors: ThemeColors = {
  primary: '#0F172A',
  warning: '#B5443B',
  background: '#FFFFFF',
  textNearBlack: '#0F172A',
  textGray: '#475569',
  border: '#ECECEA',
};

const defaultSpacing: ThemeSpacing = {
  s8: 8,
  s16: 16,
  s24: 24,
  s32: 32,
  s40: 40,
};

const defaultTheme: AppTheme = {
  colors: defaultColors,
  spacing: defaultSpacing,
  borderRadius: {
    small: 'var(--border-radius-sm)',
    medium: 'var(--border-radius-md)',
    large: 'var(--border-radius-lg)',
    pill: '9999px',
  },
  typography: {
    h1: {
      fontSize: '22px',
      lineHeight: '30px',
      fontWeight: '800',
      color: defaultColors.textNearBlack,
    },
    h2: {
      fontSize: '18px',
      lineHeight: '25px',
      fontWeight: '700',
      color: defaultColors.textNearBlack,
    },
    h3: {
      fontSize: '15px',
      lineHeight: '21px',
      fontWeight: '600',
      color: defaultColors.textNearBlack,
    },
    body: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: '400',
      color: defaultColors.textGray,
    },
    caption: {
      fontSize: '11px',
      lineHeight: '16px',
      fontWeight: '500',
      color: '#8A9099',
    },
  },
};

// ==========================================
// 3. React Context & Hooks Architecture
// ==========================================

const ThemeContext = createContext<AppTheme>(defaultTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider value={defaultTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ==========================================
// 4. Web Typography & Container Reference
// ==========================================

interface ThemedTextProps {
  variant?: keyof ThemeTypography;
  className?: string;
  style?: React.CSSProperties;
  color?: keyof ThemeColors;
  children: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  className = '',
  style = {},
  color,
  children,
}) => {
  const theme = useTheme();
  
  const textStyle = useMemo<React.CSSProperties>(() => {
    const base = theme.typography[variant];
    return {
      fontSize: base.fontSize,
      lineHeight: base.lineHeight,
      fontWeight: base.fontWeight,
      color: color ? theme.colors[color] : base.color,
      ...style,
    };
  }, [theme, variant, color, style]);

  const Tag = variant === 'h1' ? 'h1' : variant === 'h2' ? 'h2' : variant === 'h3' ? 'h3' : 'p';

  return (
    <Tag className={className} style={textStyle}>
      {children}
    </Tag>
  );
};

interface ThemedContainerProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  withPadding?: boolean;
}

export const ThemedContainer: React.FC<ThemedContainerProps> = ({
  className = '',
  style = {},
  children,
  withPadding = true,
}) => {
  const theme = useTheme();

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    backgroundColor: theme.colors.background,
    padding: withPadding ? `${theme.spacing.s16}px` : '0px',
    borderRadius: theme.borderRadius.medium,
    border: `1px solid ${theme.colors.border}`,
    ...style,
  }), [theme, withPadding, style]);

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
};
