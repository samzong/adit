import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const hankenStack = "'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const bricolageStack = "'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
const splineMonoStack = "'Spline Sans Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

const config = defineConfig({
  globalCss: {
    '*': {
      boxSizing: 'border-box'
    },
    'html, body, #root': {
      minWidth: '920px',
      minHeight: '620px',
      margin: '0'
    },
    html: {
      fontSize: '14px',
      colorScheme: 'light'
    },
    'html.dark': {
      colorScheme: 'dark'
    },
    body: {
      color: 'fg',
      bg: 'bg',
      fontFamily: 'body',
      colorScheme: 'inherit'
    },
    '.app-toolbar': {
      userSelect: 'none'
    }
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: hankenStack },
        body: { value: hankenStack },
        display: { value: bricolageStack },
        mono: { value: splineMonoStack }
      },
      radii: {
        panel: { value: '11px' },
        card: { value: '14px' }
      }
    },
    textStyles: {
      cardTitle: {
        value: {
          fontFamily: 'display',
          fontSize: '19px',
          fontWeight: '600',
          lineHeight: '1.22',
          letterSpacing: '-0.012em'
        }
      },
      headline: {
        value: {
          fontSize: 'sm',
          fontWeight: '700',
          lineHeight: '1.3',
          letterSpacing: '0'
        }
      },
      caption: {
        value: {
          fontSize: '13px',
          fontWeight: '500',
          lineHeight: '1.35',
          letterSpacing: '0'
        }
      }
    },
    semanticTokens: {
      colors: {
        bg: { value: { base: '#f7f6f3', _dark: '#232220' } },
        chrome: { value: { base: '#edebe6', _dark: '#2b2926' } },
        chromeBorder: { value: { base: '#dcd9d1', _dark: '#383530' } },
        panel: { value: { base: '#f7f6f3', _dark: '#211f1d' } },
        panelHeader: { value: { base: '#f1efea', _dark: '#272522' } },
        cardBg: { value: { base: '#fdfdfb', _dark: '#2a2825' } },
        cardHoverBg: { value: { base: '#ffffff', _dark: '#322f2b' } },

        fg: { value: { base: '#26241f', _dark: '#f0eee8' } },
        fgSoft: { value: { base: '#403d36', _dark: '#dcd8d0' } },
        muted: { value: { base: '#827d72', _dark: '#9b958a' } },
        faint: { value: { base: '#a6a195', _dark: '#6e695f' } },
        label: { value: { base: '#6f6a5f', _dark: '#9b958a' } },
        border: { value: { base: '#e5e2da', _dark: '#383530' } },
        borderStrong: { value: { base: '#d6d2c8', _dark: '#494540' } },

        accent: { value: { base: '#b06440', _dark: '#d18a5e' } },
        accentHover: { value: { base: '#9c5635', _dark: '#c47d52' } },
        accentOn: { value: '#ffffff' },

        track: { value: { base: '#e7e4dd', _dark: '#242220' } },
        trackBorder: { value: { base: '#dcd9d1', _dark: '#383530' } },
        trackActive: { value: { base: '#fdfdfb', _dark: '#322f2b' } },

        providerChatgptFg: { value: { base: '#5e7050', _dark: '#a3b48e' } },
        providerChatgptBg: { value: { base: '#e8ece0', _dark: '#242a1b' } },
        providerChatgptBorder: { value: { base: '#d4dcc8', _dark: '#39402c' } },
        providerGrokFg: { value: { base: '#a85936', _dark: '#d08a63' } },
        providerGrokBg: { value: { base: '#f1e6dd', _dark: '#2e2317' } },
        providerGrokBorder: { value: { base: '#e3cfbf', _dark: '#463524' } },

        capturedFg: { value: { base: '#5a8a4a', _dark: '#7bb368' } },
        waitingFg: { value: { base: '#8d743d', _dark: '#c3aa72' } },

        infoBg: { value: { base: '#f1efea', _dark: '#272522' } },
        infoBorder: { value: { base: '#dcd9d1', _dark: '#383530' } },
        infoFg: { value: { base: '#6f6a5f', _dark: '#dcd8d0' } },
        errorBg: { value: { base: '#fbeae3', _dark: '#33201a' } },
        errorBorder: { value: { base: '#e8c3b2', _dark: '#6e3a2a' } },
        errorFg: { value: { base: '#a3502f', _dark: '#e3a684' } },
        focusRing: { value: { base: '#cf8a64', _dark: '#d18a5e' } }
      },
      shadows: {
        primaryButton: { value: '0 1px 2px rgba(50, 38, 20, 0.12)' },
        trackActive: { value: { base: '0 1px 2px rgba(50, 38, 20, 0.07)', _dark: '0 1px 2px rgba(0, 0, 0, 0.3)' } },
        card: { value: { base: '0 1px 2px rgba(50, 38, 20, 0.05)', _dark: '0 1px 2px rgba(0, 0, 0, 0.34)' } },
        cardHover: {
          value: {
            base: '0 16px 32px rgba(50, 38, 20, 0.11)',
            _dark: '0 16px 34px rgba(0, 0, 0, 0.46)'
          }
        },
        menu: {
          value: {
            base: '0 18px 40px rgba(50, 38, 20, 0.18)',
            _dark: '0 20px 44px rgba(0, 0, 0, 0.52)'
          }
        },
        focus: { value: { base: '0 0 0 3px rgba(176, 100, 64, 0.22)', _dark: '0 0 0 3px rgba(209, 138, 94, 0.24)' } }
      }
    }
  }
})

export const system = createSystem(defaultConfig, config)
