import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        body: { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
      },
      colors: {
        adit: {
          50: { value: '#edf7f4' },
          100: { value: '#d4ece6' },
          200: { value: '#a9d9cd' },
          300: { value: '#78c0ad' },
          400: { value: '#4aa28d' },
          500: { value: '#1f4f46' },
          600: { value: '#19443c' },
          700: { value: '#153831' },
          800: { value: '#102c27' },
          900: { value: '#0b211d' }
        }
      },
      radii: {
        panel: { value: '8px' }
      }
    },
    semanticTokens: {
      colors: {
        bg: { value: { base: '#f6f7f8', _dark: '#090b0d' } },
        panel: { value: { base: '#ffffff', _dark: '#111417' } },
        panelMuted: { value: { base: '#f0f3f4', _dark: '#1a1f23' } },
        fg: { value: { base: '#121416', _dark: '#f4f7f6' } },
        muted: { value: { base: '#697076', _dark: '#9aa3a8' } },
        border: { value: { base: '#e1e5e8', _dark: '#242b30' } },
        accent: { value: { base: '{colors.adit.500}', _dark: '{colors.adit.400}' } },
        accentHover: { value: { base: '{colors.adit.600}', _dark: '{colors.adit.300}' } },
        accentContrast: { value: { base: '#ffffff', _dark: '#07110f' } },
        actionFg: { value: { base: '#252b30', _dark: '#dce5e2' } },
        actionBorder: { value: { base: '#cfd6da', _dark: '#3a444b' } },
        actionHoverBg: { value: { base: '#f0f3f4', _dark: '#1a1f23' } },
        actionDisabledFg: { value: { base: '#9aa3a8', _dark: '#748087' } },
        actionDisabledBorder: { value: { base: '#e1e5e8', _dark: '#2b343a' } },
        subtleActionBg: { value: { base: '#f0f3f4', _dark: '#20262b' } },
        subtleActionFg: { value: { base: '#252b30', _dark: '#dce5e2' } },
        subtleActionHoverBg: { value: { base: '#e1e5e8', _dark: '#293137' } },
        headerBg: { value: { base: 'rgba(255, 255, 255, 0.92)', _dark: 'rgba(11, 13, 15, 0.9)' } },
        headerBorder: { value: { base: '#e1e5e8', _dark: '#242b30' } },
        headerMuted: { value: { base: '#697076', _dark: '#9aa3a8' } },
        sessionHeaderBg: { value: { base: 'rgba(255, 255, 255, 0.92)', _dark: 'rgba(9, 9, 10, 0.94)' } },
        sessionHeaderBorder: { value: { base: '#e1e5e8', _dark: 'rgba(255, 255, 255, 0.12)' } },
        sessionHeaderMuted: { value: { base: '#697076', _dark: 'rgba(255, 255, 255, 0.72)' } },
        sessionActionBg: { value: { base: '#111417', _dark: 'rgba(255, 255, 255, 0.14)' } },
        sessionActionFg: { value: { base: '#ffffff', _dark: '#f4f7f6' } },
        sessionActionHover: { value: { base: '#252b30', _dark: 'rgba(255, 255, 255, 0.22)' } },
        capturedFg: { value: { base: '#16825e', _dark: '#63d7a5' } },
        waitingFg: { value: { base: '#a15c05', _dark: '#f0c266' } },
        infoBg: { value: { base: '#edf7f4', _dark: '#0f2823' } },
        infoBorder: { value: { base: '#a9d9cd', _dark: '#276757' } },
        infoFg: { value: { base: '#153831', _dark: '#b9eee0' } },
        errorBg: { value: { base: '#fff1f1', _dark: '#341719' } },
        errorBorder: { value: { base: '#ffc9c9', _dark: '#7f3035' } },
        errorFg: { value: { base: '#7a1e24', _dark: '#ffd2d5' } },
        focusRing: { value: { base: '{colors.adit.300}', _dark: '{colors.adit.400}' } }
      }
    }
  }
})

export const system = createSystem(defaultConfig, config)
