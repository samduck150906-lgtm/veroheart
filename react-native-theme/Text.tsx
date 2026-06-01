import React from 'react';
import { Text as RNText, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { ThemeColors, ThemeTypography } from './ThemeProvider';

export interface TextProps {
  /**
   * Font variant from design system typography.
   * Default is 'body'.
   */
  variant?: keyof ThemeTypography;
  /**
   * Custom font weight override.
   */
  fontWeight?: TextStyle['fontWeight'];
  /**
   * Text color. Can be a design system color token key or any color string.
   */
  color?: keyof ThemeColors | string;
  /**
   * Text alignment.
   */
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  /**
   * Maximum number of lines. Truncates with ellipsis if exceeded.
   */
  numberOfLines?: number;
  /**
   * Custom style overrides.
   */
  style?: TextStyle | TextStyle[];
  /**
   * Text content
   */
  children: React.ReactNode;
}

/**
 * Premium unified Text component for the Veroro Mobile Design System.
 * Seamlessly integrates with the Theme Provider, respects standard typography hierarchy,
 * and allows high design flexibility with customizable color tokens, weights, alignments, and truncation.
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  fontWeight,
  color,
  align = 'auto',
  numberOfLines,
  style,
  children,
}) => {
  const theme = useTheme();

  // Retrieve base typography styling
  const baseTypo = theme.typography[variant];

  // Resolve color (check if color key exists in theme tokens, otherwise fallback to color string)
  const resolvedColor = color
    ? (theme.colors[color as keyof ThemeColors] || color)
    : baseTypo.color;

  // Build merged Stylesheet object
  const mergedStyle: TextStyle = {
    fontSize: baseTypo.fontSize,
    lineHeight: baseTypo.lineHeight,
    fontWeight: fontWeight || baseTypo.fontWeight,
    color: resolvedColor,
    textAlign: align,
  };

  return (
    <RNText
      style={[mergedStyle, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={numberOfLines ? 'tail' : undefined}
    >
      {children}
    </RNText>
  );
};
