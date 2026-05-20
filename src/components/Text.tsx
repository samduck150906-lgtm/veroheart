import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors, ThemeTypography } from '../theme/ThemeProvider';

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Font variant from design system typography.
   * Default is 'body'.
   */
  variant?: keyof ThemeTypography;
  /**
   * Custom font weight override.
   */
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extra-bold' | string | number;
  /**
   * Text color. Can be a design system color token key or any color string.
   */
  color?: keyof ThemeColors | string;
  /**
   * Text alignment.
   */
  align?: 'left' | 'right' | 'center' | 'justify';
  /**
   * Maximum number of lines. Truncates with ellipsis if exceeded.
   */
  numberOfLines?: number;
  /**
   * HTML tag to render. Defaults to semantic tag matching the variant.
   */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div' | 'label';
  /**
   * Text content or nested children
   */
  children?: React.ReactNode;
}

/**
 * Premium unified Text component for the Veroro Web Design System.
 * Fully bound to the responsive theme parameters, supporting standard web font properties,
 * inline/block text-align configurations, and robust cross-browser multi-line clamping.
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  fontWeight,
  color,
  align,
  numberOfLines,
  as,
  style = {},
  className = '',
  children,
  ...rest
}) => {
  const theme = useTheme();

  // 1. Resolve base typography properties
  const baseTypo = theme.typography[variant];

  // 2. Resolve HTML Tag: Use 'as' prop if specified, otherwise choose semantic tag
  const Tag = as || (variant === 'h1' ? 'h1' : variant === 'h2' ? 'h2' : variant === 'h3' ? 'h3' : variant === 'caption' ? 'span' : 'p');

  // 3. Resolve Font Weight mappings
  const resolvedFontWeight = useMemo(() => {
    if (!fontWeight) return baseTypo.fontWeight;
    
    // Friendly weight names mapping
    const weightMap: Record<string, string> = {
      'normal': '400',
      'medium': '500',
      'semibold': '600',
      'bold': '700',
      'extra-bold': '800',
    };
    
    return weightMap[String(fontWeight)] || String(fontWeight);
  }, [fontWeight, baseTypo.fontWeight]);

  // 4. Resolve Color Token
  const resolvedColor = useMemo(() => {
    if (!color) return baseTypo.color;
    return (theme.colors[color as keyof ThemeColors] || color);
  }, [color, theme.colors, baseTypo.color]);

  // 5. Build dynamic styles including multi-line clamping
  const mergedStyle = useMemo<React.CSSProperties>(() => {
    let clampStyles: React.CSSProperties = {};

    if (numberOfLines) {
      if (numberOfLines === 1) {
        clampStyles = {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        };
      } else {
        clampStyles = {
          display: '-webkit-box',
          WebkitLineClamp: numberOfLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        };
      }
    }

    return {
      fontSize: baseTypo.fontSize,
      lineHeight: baseTypo.lineHeight,
      fontWeight: resolvedFontWeight,
      color: resolvedColor,
      textAlign: align,
      margin: 0, // Reset default browser headings margins
      ...clampStyles,
      ...style,
    };
  }, [baseTypo, resolvedFontWeight, resolvedColor, align, numberOfLines, style]);

  return (
    <Tag style={mergedStyle} className={`veroro-text-${variant} ${className}`} {...rest}>
      {children}
    </Tag>
  );
};
