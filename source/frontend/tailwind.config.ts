import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════════════
         COLORS - HSL Format with CSS Variables
         ═══════════════════════════════════════════════════════════════ */
      colors: {
        // Base colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // Card
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Popover
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        // Primary - Blue (#3B82F6 -> 217 91% 60%)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          active: 'hsl(var(--primary-active))',
          muted: 'hsl(var(--primary-muted))',
          subtle: 'hsl(var(--primary-subtle))',
        },

        // Secondary - Slate
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          hover: 'hsl(var(--secondary-hover))',
          muted: 'hsl(var(--secondary-muted))',
        },

        // Destructive - Red (#EF4444 -> 0 84% 60%)
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          hover: 'hsl(var(--destructive-hover))',
          active: 'hsl(var(--destructive-active))',
          muted: 'hsl(var(--destructive-muted))',
          subtle: 'hsl(var(--destructive-subtle))',
        },

        // Muted
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        // Accent - Indigo
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          muted: 'hsl(var(--accent-muted))',
        },

        // Semantic - Success (Green)
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          muted: 'hsl(var(--success-muted))',
          subtle: 'hsl(var(--success-subtle))',
        },

        // Semantic - Warning (Amber)
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          muted: 'hsl(var(--warning-muted))',
          subtle: 'hsl(var(--warning-subtle))',
        },

        // Semantic - Info (Cyan)
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          muted: 'hsl(var(--info-muted))',
          subtle: 'hsl(var(--info-subtle))',
        },

        // UI Elements
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Chart colors for data visualization
        chart: {
          1: 'hsl(var(--chart-1))',  // Blue - Stock
          2: 'hsl(var(--chart-2))',  // Red - Demand
          3: 'hsl(var(--chart-3))',  // Green - Success
          4: 'hsl(var(--chart-4))',  // Amber - Warning
          5: 'hsl(var(--chart-5))',  // Indigo - Accent
          6: 'hsl(var(--chart-6))',  // Cyan - Info
        },
      },

      /* ═══════════════════════════════════════════════════════════════
         TYPOGRAPHY
         ═══════════════════════════════════════════════════════════════ */
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'monospace'],
      },

      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
        base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px - KPIs
        '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px - Large metrics
      },

      lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },

      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },

      /* ═══════════════════════════════════════════════════════════════
         SPACING
         ═══════════════════════════════════════════════════════════════ */
      spacing: {
        '0': '0',
        'px': '1px',
        '0.5': '0.125rem',   // 2px
        '1': '0.25rem',      // 4px
        '1.5': '0.375rem',   // 6px
        '2': '0.5rem',       // 8px
        '2.5': '0.625rem',   // 10px
        '3': '0.75rem',      // 12px
        '3.5': '0.875rem',   // 14px
        '4': '1rem',         // 16px
        '5': '1.25rem',      // 20px
        '6': '1.5rem',       // 24px
        '7': '1.75rem',      // 28px
        '8': '2rem',         // 32px
        '9': '2.25rem',      // 36px
        '10': '2.5rem',      // 40px
        '11': '2.75rem',     // 44px
        '12': '3rem',        // 48px
        '14': '3.5rem',      // 56px
        '16': '4rem',        // 64px
        '20': '5rem',        // 80px
        '24': '6rem',        // 96px
        '28': '7rem',        // 112px
        '32': '8rem',        // 128px
        // Layout-specific spacing
        'sidebar': '280px',
        'header': '64px',
      },

      /* ═══════════════════════════════════════════════════════════════
         BORDER RADIUS
         ═══════════════════════════════════════════════════════════════ */
      borderRadius: {
        none: '0',
        sm: '0.25rem',       // 4px - Buttons, inputs
        DEFAULT: '0.375rem', // 6px - Default
        md: '0.375rem',      // 6px - Small cards
        lg: '0.5rem',        // 8px - Cards, modals
        xl: '0.75rem',       // 12px - Large cards
        '2xl': '1rem',       // 16px - Hero elements
        '3xl': '1.5rem',     // 24px - Feature cards
        full: '9999px',      // Pills, avatars
      },

      /* ═══════════════════════════════════════════════════════════════
         BOX SHADOWS
         ═══════════════════════════════════════════════════════════════ */
      boxShadow: {
        xs: '0 1px 2px hsl(var(--shadow-color) / 0.05)',
        sm: '0 1px 3px hsl(var(--shadow-color) / 0.08), 0 1px 2px hsl(var(--shadow-color) / 0.04)',
        DEFAULT: '0 4px 6px hsl(var(--shadow-color) / 0.07), 0 2px 4px hsl(var(--shadow-color) / 0.04)',
        md: '0 4px 6px hsl(var(--shadow-color) / 0.07), 0 2px 4px hsl(var(--shadow-color) / 0.04)',
        lg: '0 10px 15px hsl(var(--shadow-color) / 0.08), 0 4px 6px hsl(var(--shadow-color) / 0.04)',
        xl: '0 20px 25px hsl(var(--shadow-color) / 0.10), 0 8px 10px hsl(var(--shadow-color) / 0.04)',
        // Colored shadows
        primary: '0 4px 14px hsl(217 91% 60% / 0.25)',
        destructive: '0 4px 14px hsl(0 84% 60% / 0.25)',
        success: '0 4px 14px hsl(142 71% 45% / 0.25)',
        warning: '0 4px 14px hsl(38 92% 50% / 0.25)',
        none: 'none',
      },

      /* ═══════════════════════════════════════════════════════════════
         ANIMATIONS
         ═══════════════════════════════════════════════════════════════ */
      animation: {
        // Entrance animations
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-up': 'fadeInUp 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slideInRight 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-left': 'slideInLeft 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        // Alert animations
        'alert-slide-in': 'alertSlideIn 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        'attention-pulse': 'attentionPulse 2s ease-in-out infinite',
        // Loading animations
        'shimmer': 'shimmer 2s linear infinite',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s ease-in-out infinite',
        // Chart animations
        'draw-line': 'drawLine 1s ease-out forwards',
        'reveal-area': 'revealArea 800ms ease-out forwards',
        'pop-in': 'popIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'count-pulse': 'countPulse 600ms ease-in-out',
        // Accordion (from tailwindcss-animate)
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        alertSlideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        attentionPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(0 84% 60% / 0.4)' },
          '50%': { boxShadow: '0 0 0 8px hsl(0 84% 60% / 0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        drawLine: {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
        revealArea: {
          from: { clipPath: 'inset(100% 0 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0)' },
          '70%': { transform: 'scale(1.1)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        countPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },

      /* ═══════════════════════════════════════════════════════════════
         TRANSITIONS
         ═══════════════════════════════════════════════════════════════ */
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',     // fast
        '150': '150ms',
        '200': '200ms',     // normal
        '300': '300ms',     // moderate
        '400': '400ms',     // slow
        '500': '500ms',     // slower
        '700': '700ms',     // slowest
        '1000': '1000ms',
      },

      transitionTimingFunction: {
        linear: 'linear',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        enterprise: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.3, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      },

      /* ═══════════════════════════════════════════════════════════════
         Z-INDEX
         ═══════════════════════════════════════════════════════════════ */
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '100',
        'sticky': '200',
        'header': '300',
        'overlay': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
      },
    },
  },

  plugins: [
    tailwindcssAnimate,
  ],
};

export default config;
