import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// ==========================================
// 1. Theme Interface & Type Definitions
// ==========================================

export interface ThemeColors {
  primary: string;        // Saffron Gold (#F5C518)
  primaryLight: string;   // Saffron Gold 12% Opacity
  warning: string;        // Danger Red (#F04452)
  warningLight: string;   // Danger Red 10% Opacity
  background: string;     // Surface White (#FFFFFF)
  surface: string;        // Gray fill (#F2F4F6)
  textNearBlack: string;  // Ink-900 / Base Text (#191F28)
  textGray: string;       // Ink-600 / Description Text (#4E5968)
  textMuted: string;      // Ink-400 / Placeholder Text (#8B95A1)
  border: string;         // Delicate divider line (#E5E8EB)
}

export interface FontStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '900' | '800' | '700' | '600' | '500' | '400' | 'normal' | 'bold';
  color: string;
}

export interface ThemeTypography {
  h1: FontStyle;      // Page Headlines / High Emphasis
  h2: FontStyle;      // Section Titles / Mid Emphasis
  h3: FontStyle;      // Component Titles / Low Emphasis
  body: FontStyle;    // Standard reading text
  caption: FontStyle; // Small details / metadata
}

export interface ThemeSpacing {
  s8: number;   // Micro spacing (margins, paddings)
  s16: number;  // Standard spacing (paddings, item gaps)
  s24: number;  // Content gaps (block separators)
  s32: number;  // Large section gaps
  s40: number;  // Extra large container margins
}

export interface ThemeShadows {
  soft: ViewStyle;
  medium: ViewStyle;
}

export interface AppTheme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  shadows: ThemeShadows;
  borderRadius: {
    small: number;
    medium: number;
    large: number;
    pill: number;
  };
}

// ==========================================
// 2. Production Palette & Values Config
// ==========================================

const defaultColors: ThemeColors = {
  primary: '#F5C518',
  primaryLight: 'rgba(245, 197, 24, 0.12)',
  warning: '#F04452',
  warningLight: 'rgba(240, 68, 82, 0.1)',
  background: '#FFFFFF',
  surface: '#F2F4F6',
  textNearBlack: '#191F28',
  textGray: '#4E5968',
  textMuted: '#8B95A1',
  border: '#E5E8EB',
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
    small: 10,
    medium: 14,
    large: 20,
    pill: 999,
  },
  typography: {
    h1: {
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '800', // Bold & impactful
      color: defaultColors.textNearBlack,
    },
    h2: {
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '700',
      color: defaultColors.textNearBlack,
    },
    h3: {
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '600',
      color: defaultColors.textNearBlack,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400', // Highly readable body
      color: defaultColors.textGray,
    },
    caption: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
      color: defaultColors.textMuted,
    },
  },
  shadows: {
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.02,
      shadowRadius: 12,
      elevation: 2,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 4,
    },
  },
};

// ==========================================
// 3. React Context & Hooks Architecture
// ==========================================

const ThemeContext = createContext<AppTheme>(defaultTheme);

export interface ThemeProviderProps {
  children: React.ReactNode;
  customColors?: Partial<ThemeColors>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, customColors }) => {
  const theme = useMemo<AppTheme>(() => {
    if (!customColors) return defaultTheme;
    
    const mergedColors = { ...defaultColors, ...customColors };
    return {
      ...defaultTheme,
      colors: mergedColors,
      typography: {
        h1: { ...defaultTheme.typography.h1, color: mergedColors.textNearBlack },
        h2: { ...defaultTheme.typography.h2, color: mergedColors.textNearBlack },
        h3: { ...defaultTheme.typography.h3, color: mergedColors.textNearBlack },
        body: { ...defaultTheme.typography.body, color: mergedColors.textGray },
        caption: { ...defaultTheme.typography.caption, color: mergedColors.textMuted },
      },
    };
  }, [customColors]);

  return (
    <ThemeContext.Provider value={theme}>
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
// 4. Premium Themed Reference Components
// ==========================================

interface ThemedTextProps {
  variant?: keyof ThemeTypography;
  style?: TextStyle | TextStyle[];
  color?: keyof ThemeColors;
  children: React.ReactNode;
  numberOfLines?: number;
}

/**
 * Pre-themed Typography Component supporting multi-variant typography configurations
 */
export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  style,
  color,
  children,
  numberOfLines,
}) => {
  const theme = useTheme();
  
  const textStyle = useMemo<TextStyle>(() => {
    const base = theme.typography[variant];
    return {
      fontSize: base.fontSize,
      lineHeight: base.lineHeight,
      fontWeight: base.fontWeight,
      color: color ? theme.colors[color] : base.color,
    };
  }, [theme, variant, color]);

  return (
    <React.Fragment>
      {/* 
        In actual React Native code, this would render a <Text> component:
        <Text style={[textStyle, style]} numberOfLines={numberOfLines}>{children}</Text> 
      */}
      {children}
    </React.Fragment>
  );
};

interface ThemedContainerProps {
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  withPadding?: boolean;
  withShadow?: boolean;
}

/**
 * Pre-themed cosmetics-style layout block utilizing standard padding & styling
 */
export const ThemedContainer: React.FC<ThemedContainerProps> = ({
  style,
  children,
  withPadding = true,
  withShadow = false,
}) => {
  const theme = useTheme();

  const containerStyle = useMemo<ViewStyle>(() => ({
    backgroundColor: theme.colors.background,
    padding: withPadding ? theme.spacing.s16 : 0,
    borderRadius: theme.borderRadius.medium,
    borderWidth: withShadow ? 0 : 1,
    borderColor: theme.colors.border,
    ...(withShadow ? theme.shadows.soft : {}),
  }), [theme, withPadding, withShadow]);

  return (
    <React.Fragment>
      {/* 
        In actual React Native code, this would render a <View> container:
        <View style={[containerStyle, style]}>{children}</View> 
      */}
      {children}
    </React.Fragment>
  );
};
