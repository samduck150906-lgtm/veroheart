import React, { useRef } from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from './ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'disabled';

export interface ButtonProps {
  /**
   * Button title text
   */
  title: string;
  /**
   * Action on press
   */
  onPress?: () => void;
  /**
   * Style variant. If 'disabled' is passed, it behaves like disabled=true.
   * Default is 'primary'.
   */
  variant?: ButtonVariant;
  /**
   * Loading state. Replaces text with a spinner and disables interaction.
   */
  loading?: boolean;
  /**
   * Manual disable flag
   */
  disabled?: boolean;
  /**
   * Custom style overrides for the button container
   */
  style?: ViewStyle | ViewStyle[];
  /**
   * Custom style overrides for the button text
   */
  textStyle?: TextStyle | TextStyle[];
  /**
   * Active animation type: 'scale' | 'opacity'. Default is 'scale'.
   */
  animationType?: 'scale' | 'opacity';
}

/**
 * Premium reusable Button component for the Veroro Global Design System.
 * Fully supports multiple variants, dynamic loading spinner, custom interactive micro-animations (scale/opacity),
 * and leverages unified theme spacing, typography, and color tokens.
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  animationType = 'scale',
}) => {
  const theme = useTheme();

  // Determine actual interactive and visual states
  const isActuallyDisabled = disabled || loading || variant === 'disabled';

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Touch handlers for micro-animations
  const handlePressIn = () => {
    if (isActuallyDisabled) return;
    
    if (animationType === 'scale') {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (isActuallyDisabled) return;

    if (animationType === 'scale') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  // Build styles based on design system tokens
  const getContainerStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: 52,
      borderRadius: theme.borderRadius.medium,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.s24,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: 'transparent',
    };

    if (isActuallyDisabled) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primaryLight,
          borderColor: 'transparent',
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: theme.colors.border,
        };
      case 'primary':
      default:
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
          borderColor: 'transparent',
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: theme.typography.h3.fontSize,
      lineHeight: theme.typography.h3.lineHeight,
      fontWeight: theme.typography.h3.fontWeight,
    };

    if (isActuallyDisabled) {
      return {
        ...baseStyle,
        color: theme.colors.textMuted,
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyle,
          color: theme.colors.primary,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: theme.colors.textNearBlack,
        };
      case 'primary':
      default:
        return {
          ...baseStyle,
          color: theme.colors.background, // Pure White (#FFFFFF)
        };
    }
  };

  // Interpolated animation style
  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  return (
    <Animated.View style={[animatedStyle, { width: '100%' }]}>
      <Pressable
        onPress={isActuallyDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[getContainerStyles(), style]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isActuallyDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'primary' && !isActuallyDisabled
                ? theme.colors.background
                : variant === 'secondary'
                ? theme.colors.primary
                : theme.colors.textGray
            }
            size="small"
          />
        ) : (
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};
