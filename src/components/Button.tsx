import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'disabled';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button title text
   */
  title: string;
  /**
   * Action on click
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
   * Active animation type: 'scale' | 'opacity' | 'none'. Default is 'scale'.
   */
  animationType?: 'scale' | 'opacity' | 'none';
}

/**
 * Premium reusable Web Button component matching the Veroro Global Design System.
 * Fully supports hover micro-interactions, scale/opacity transitions, multiple variants,
 * and a smooth SVG spinner when in a loading state.
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  style = {},
  animationType = 'scale',
  ...rest
}) => {
  const theme = useTheme();

  // Determine actual interactive and visual states
  const isActuallyDisabled = disabled || loading || variant === 'disabled';

  // Base layout styles based on Design System tokens
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '52px',
    paddingLeft: `${theme.spacing.s24}px`,
    paddingRight: `${theme.spacing.s24}px`,
    borderRadius: theme.borderRadius.medium,
    fontFamily: 'inherit',
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: theme.typography.h3.fontWeight,
    border: '1px solid transparent',
    cursor: isActuallyDisabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    boxSizing: 'border-box',
    userSelect: 'none',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  // Color variants logic
  const getVariantStyles = (): React.CSSProperties => {
    if (isActuallyDisabled) {
      return {
        backgroundColor: '#F3F4F6', // Neutral soft gray
        borderColor: theme.colors.border,
        color: '#9CA3AF', // Muted text gray
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'rgba(129, 201, 149, 0.12)', // primaryLight (Mint 12%)
          borderColor: 'transparent',
          color: theme.colors.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.colors.border,
          color: theme.colors.textNearBlack,
        };
      case 'primary':
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderColor: 'transparent',
          color: theme.colors.background, // Pure white
        };
    }
  };

  // Merge inline styles
  const mergedStyles = {
    ...baseStyle,
    ...getVariantStyles(),
  };

  // Dynamic CSS classes for micro-animations (scale, opacity, active transformations)
  const getAnimationClass = () => {
    if (isActuallyDisabled) return '';
    
    let animClass = 'veroro-btn-interactive';
    if (animationType === 'scale') {
      animClass += ' veroro-btn-scale';
    } else if (animationType === 'opacity') {
      animClass += ' veroro-btn-opacity';
    }
    
    return animClass;
  };

  return (
    <>
      <button
        onClick={isActuallyDisabled ? undefined : onClick}
        disabled={isActuallyDisabled}
        style={mergedStyles}
        className={`${getAnimationClass()} ${className}`}
        aria-busy={loading}
        {...rest}
      >
        {loading ? (
          <div className="veroro-spinner-container">
            <svg
              className="veroro-btn-spinner"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                style={{ opacity: 0.25 }}
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                style={{ opacity: 0.85 }}
              />
            </svg>
          </div>
        ) : (
          <span>{title}</span>
        )}
      </button>

      {/* Embedded micro-interaction CSS styling to ensure absolute zero dependencies */}
      <style>{`
        .veroro-btn-interactive {
          position: relative;
        }
        
        /* Hover Effects */
        .veroro-btn-interactive:hover {
          filter: brightness(0.97);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }
        
        /* Active Scale Micro-Animation */
        .veroro-btn-scale:active {
          transform: scale(0.96) !important;
          transition: transform 0.08s cubic-bezier(0, 0, 0.2, 1) !important;
        }
        
        /* Active Opacity Micro-Animation */
        .veroro-btn-opacity:active {
          opacity: 0.72 !important;
          transition: opacity 0.08s cubic-bezier(0, 0, 0.2, 1) !important;
        }

        /* SVG Spinner Styling */
        .veroro-spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .veroro-btn-spinner {
          animation: veroro-spin 0.85s linear infinite;
          height: 20px;
          width: 20px;
          color: inherit;
        }
        
        @keyframes veroro-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};
