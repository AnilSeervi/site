const { spacing, fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./pages/**/*.tsx', './components/**/*.tsx', './layouts/**/*.tsx', "./lib/**/*.{js,ts}",],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'blue-opaque': 'rgb(13 42 148 / 18%)',
        gray: {
          0: '#fff',
          100: '#fafafa',
          200: '#eaeaea',
          300: '#999999',
          400: '#888888',
          500: '#666666',
          600: '#444444',
          700: '#333333',
          800: '#222222',
          900: '#111111'
        }
      },
      fontFamily: {
        sans: ['var(--font-karla)', ...fontFamily.sans],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.700'),
            a: {
              color: theme('colors.blue.500'),
              '&:hover': {
                color: theme('colors.blue.700')
              },
              code: {
                color: theme('colors.blue.400'),

              },
            },
            'h2,h3,h4': {
              'scroll-margin-top': spacing[32]
            },
            thead: {
              borderBottomColor: theme('colors.gray.200')
            },
            code: { color: theme('colors.pink.500') },
            'blockquote p:first-of-type::before': false,
            'blockquote p:last-of-type::after': false
          }
        },
        dark: {
          css: {
            color: theme('colors.gray.200'),
            a: {
              color: theme('colors.blue.400'),
              '&:hover': {
                color: theme('colors.blue.600')
              },
              code: { color: theme('colors.blue.400') }
            },
            blockquote: {
              borderLeftColor: theme('colors.gray.700'),
              color: theme('colors.gray.300')
            },
            'h2,h3,h4': {
              color: theme('colors.gray.100'),
              'scroll-margin-top': spacing[32]
            },
            hr: { borderColor: theme('colors.gray.700') },
            ol: {
              li: {
                '&:before': { color: theme('colors.gray.500') }
              }
            },
            ul: {
              li: {
                '&:before': { backgroundColor: theme('colors.gray.500') }
              }
            },
            strong: { color: theme('colors.gray.100') },
            thead: {
              th: {
                color: theme('colors.gray.100')
              },
              borderBottomColor: theme('colors.gray.600')
            },
            tbody: {
              tr: {
                borderBottomColor: theme('colors.gray.700')
              }
            }
          }
        }
      }),
      animation: {
        bar1: "bar1 1s ease-in-out infinite",
        bar2: "bar2 1.5s 0.2s ease-in-out infinite",
        bar3: "bar3 1.5s 0.3s ease-in-out infinite",
      },
      keyframes: ({ theme }) => ({
        mutation: {
          "0%": {
            background: theme("colors.zinc.400 / 3%"),
          },
          "10%": {
            background: theme("colors.zinc.400 / 15%"),
            color: theme("colors.zinc.400 / 75%"),
          },
          "100%": {
            background: theme("colors.zinc.400 / 0%"),
          },
        },
        emoji: {
          "0%": {
            opacity: "0",
            transform: "translateY(0) scale(0)",
          },
          "50%": {
            opacity: "1",
            transform: "translateY(-40px) scale(1)",
          },
          to: {
            opacity: "0",
            transform: "translateY(-60px) scale(1.4)",
          },
        },
        loading: {
          "0%": {
            opacity: ".2",
          },
          "20%": {
            opacity: "1",
            transform: "translateX(1px)",
          },
          to: {
            opacity: ".2",
          },
        },
        bar1: {
          "0%": { transform: 'scaleY(1.0) translateY(0rem)' },
          "50%": { transform: 'scaleY(1.0) translateY(0rem)' },
          "100%": { transform: 'scaleY(1.0) translateY(0rem)' }
        },
        bar2: {
          '0%': { transform: 'scaleY(1.0) translateY(0rem)' },
          "50%": { transform: 'scaleY(3) translateY(-0.083rem)' },
          "100%": { transform: 'scaleY(1.0) translateY(0rem)' }
        },
        bar3: {
          "0%": { transform: 'scaleY(1.0)  translateY(0rem)' },
          "50%": { transform: 'scaleY(0.5) translateY(0.37rem)' },
          "100%": { transform: 'scaleY(1.0)  translateY(0rem)' }
        }
      }),
    }
  },
  variants: {
    typography: ['dark']
  },
};
