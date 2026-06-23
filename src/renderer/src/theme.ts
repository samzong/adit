import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

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
      colorScheme: 'inherit',
      fontSynthesis: 'none',
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased'
    },
    '.app-toolbar': {
      userSelect: 'none'
    },
    '.app-region-drag': {
      WebkitAppRegion: 'drag'
    },
    '.app-region-no-drag': {
      WebkitAppRegion: 'no-drag'
    }
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        body: { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
      },
      colors: {
        adit: {
          50: { value: '#f2f4f2' },
          100: { value: '#e4e8e5' },
          200: { value: '#cbd3cf' },
          300: { value: '#aebbb5' },
          400: { value: '#8f9f98' },
          500: { value: '#6f8179' },
          600: { value: '#5b6b64' },
          700: { value: '#46524d' },
          800: { value: '#303a36' },
          900: { value: '#202824' }
        }
      },
      radii: {
        panel: { value: '10px' }
      }
    },
    textStyles: {
      headline: {
        value: {
          fontSize: 'sm',
          fontWeight: '700',
          lineHeight: '1.25',
          letterSpacing: '0'
        }
      },
      caption: {
        value: {
          fontSize: 'xs',
          lineHeight: '1.3',
          letterSpacing: '0'
        }
      }
    },
    semanticTokens: {
      colors: {
        bg: { value: { base: '#f5f5f3', _dark: '#111315' } },
        panel: { value: { base: '#fbfbf9', _dark: '#191b1f' } },
        panelMuted: { value: { base: '#eceeeb', _dark: '#22262b' } },
        cardBg: { value: { base: '#fafaf8', _dark: '#1b1e22' } },
        cardHoverBg: { value: { base: '#ffffff', _dark: '#20242a' } },
        fg: { value: { base: '#1c1f1d', _dark: '#f1f2ef' } },
        muted: { value: { base: '#6f7572', _dark: '#8f969b' } },
        border: { value: { base: '#dedfda', _dark: '#2b3036' } },
        accent: { value: { base: '{colors.adit.600}', _dark: '{colors.adit.300}' } },
        accentOn: { value: { base: '#fbfbf9', _dark: '#111315' } },
        accentHover: { value: { base: '{colors.adit.700}', _dark: '{colors.adit.200}' } },
        providerChatgptBg: { value: { base: '#e5ede8', _dark: '#25302c' } },
        providerChatgptFg: { value: { base: '#40554b', _dark: '#bac9c1' } },
        providerChatgptBorder: { value: { base: '#cbd8d1', _dark: '#34443d' } },
        providerGrokBg: { value: { base: '#ebe8ef', _dark: '#2b2832' } },
        providerGrokFg: { value: { base: '#51475e', _dark: '#c9bfd5' } },
        providerGrokBorder: { value: { base: '#d8d1df', _dark: '#3d3649' } },
        actionFg: { value: { base: '#2f3431', _dark: '#d7dbd7' } },
        actionBorder: { value: { base: '#d6d8d3', _dark: '#373d43' } },
        actionHoverBg: { value: { base: '#ebede9', _dark: '#272c31' } },
        actionDisabledFg: { value: { base: '#a3a8a4', _dark: '#686f75' } },
        actionDisabledBorder: { value: { base: '#e4e5e0', _dark: '#30363b' } },
        headerBg: { value: { base: 'rgba(250, 250, 248, 0.92)', _dark: 'rgba(20, 22, 25, 0.92)' } },
        headerBorder: { value: { base: '#dddfda', _dark: '#2b3036' } },
        headerMuted: { value: { base: '#777d79', _dark: '#8f969b' } },
        sessionHeaderBg: { value: { base: 'rgba(250, 250, 248, 0.92)', _dark: 'rgba(17, 19, 21, 0.94)' } },
        sessionHeaderBorder: { value: { base: '#dddfda', _dark: '#2b3036' } },
        sessionHeaderMuted: { value: { base: '#777d79', _dark: '#9ba1a5' } },
        sessionActionBg: { value: { base: '#252a27', _dark: '#dfe4df' } },
        sessionActionFg: { value: { base: '#fbfbf9', _dark: '#171a1d' } },
        sessionActionHover: { value: { base: '#333933', _dark: '#cbd3cf' } },
        capturedFg: { value: { base: '{colors.adit.600}', _dark: '{colors.adit.300}' } },
        waitingFg: { value: { base: '#8d743d', _dark: '#c3aa72' } },
        infoBg: { value: { base: '#eef2ef', _dark: '#1c2522' } },
        infoBorder: { value: { base: '#cbd3cf', _dark: '#3b4843' } },
        infoFg: { value: { base: '#46524d', _dark: '#cbd3cf' } },
        errorBg: { value: { base: '#fff1f1', _dark: '#341719' } },
        errorBorder: { value: { base: '#ffc9c9', _dark: '#7f3035' } },
        errorFg: { value: { base: '#7a1e24', _dark: '#ffd2d5' } },
        focusRing: { value: { base: '{colors.adit.400}', _dark: '{colors.adit.300}' } }
      },
      shadows: {
        card: { value: { base: '0 1px 2px rgba(15, 23, 42, 0.05)', _dark: '0 1px 2px rgba(0, 0, 0, 0.34)' } },
        cardHover: { value: { base: '0 10px 24px rgba(15, 23, 42, 0.1)', _dark: '0 12px 28px rgba(0, 0, 0, 0.42)' } },
        focus: { value: { base: '0 0 0 3px rgba(74, 162, 141, 0.22)', _dark: '0 0 0 3px rgba(120, 192, 173, 0.2)' } }
      }
    }
  }
})

export const system = createSystem(defaultConfig, config)
