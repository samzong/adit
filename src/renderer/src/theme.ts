import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const hankenStack =
  "'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const bricolageStack = "'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
const splineMonoStack = "'Spline Sans Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

const config = defineConfig({
  globalCss: {
    '*': {
      boxSizing: 'border-box'
    },
    'html, body, #root': {
      minWidth: '1120px',
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
    },
    '.adit-mdx-shell': {
      height: '100%',
      minWidth: '0',
      width: '100%'
    },
    '.adit-mdx-editor.adit-mdx-editor': {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#fdfdfb',
      color: '#26241f',
      minWidth: '0',
      overflow: 'hidden',
      '--font-body': hankenStack,
      '--font-mono': splineMonoStack,
      '--adit-mdx-card': '#fdfdfb',
      '--adit-mdx-panel': '#f7f6f3',
      '--adit-mdx-panel-header': '#f1efea',
      '--adit-mdx-track': '#e7e4dd',
      '--adit-mdx-border': '#e5e2da',
      '--adit-mdx-border-strong': '#d6d2c8',
      '--adit-mdx-fg': '#26241f',
      '--adit-mdx-fg-soft': '#403d36',
      '--adit-mdx-muted': '#827d72',
      '--adit-mdx-faint': '#a6a195',
      '--adit-mdx-accent': '#b06440',
      '--adit-mdx-accent-hover': '#9c5635',
      '--adit-mdx-accent-on': '#ffffff',
      '--basePageBg': 'var(--adit-mdx-card)',
      '--baseBase': 'var(--adit-mdx-panel)',
      '--baseBgSubtle': 'var(--adit-mdx-panel-header)',
      '--baseBg': 'var(--adit-mdx-panel-header)',
      '--baseBgHover': 'var(--adit-mdx-track)',
      '--baseBgActive': 'var(--adit-mdx-track)',
      '--baseLine': 'var(--adit-mdx-border)',
      '--baseBorder': 'var(--adit-mdx-border)',
      '--baseBorderHover': 'var(--adit-mdx-border-strong)',
      '--baseText': 'var(--adit-mdx-muted)',
      '--baseTextContrast': 'var(--adit-mdx-fg)',
      '--accentBase': 'var(--adit-mdx-accent)',
      '--accentBgSubtle': 'var(--adit-mdx-panel-header)',
      '--accentBg': 'var(--adit-mdx-track)',
      '--accentBgHover': 'var(--adit-mdx-track)',
      '--accentBgActive': 'var(--adit-mdx-track)',
      '--accentLine': 'var(--adit-mdx-border-strong)',
      '--accentBorder': 'var(--adit-mdx-border-strong)',
      '--accentBorderHover': 'var(--adit-mdx-accent)',
      '--accentSolid': 'var(--adit-mdx-accent)',
      '--accentSolidHover': 'var(--adit-mdx-accent-hover)',
      '--accentText': 'var(--adit-mdx-accent)',
      '--accentTextContrast': 'var(--adit-mdx-accent-on)'
    },
    'html.dark .adit-mdx-editor.adit-mdx-editor, .dark .adit-mdx-editor.adit-mdx-editor, [data-theme="dark"] .adit-mdx-editor.adit-mdx-editor':
      {
        background: '#2a2825 !important',
        color: '#f0eee8 !important',
        '--adit-mdx-card': '#2a2825',
        '--adit-mdx-panel': '#211f1d',
        '--adit-mdx-panel-header': '#272522',
        '--adit-mdx-track': '#242220',
        '--adit-mdx-border': '#383530',
        '--adit-mdx-border-strong': '#494540',
        '--adit-mdx-fg': '#f0eee8',
        '--adit-mdx-fg-soft': '#dcd8d0',
        '--adit-mdx-muted': '#9b958a',
        '--adit-mdx-faint': '#6e695f',
        '--adit-mdx-accent': '#d18a5e',
        '--adit-mdx-accent-hover': '#c47d52',
        '--adit-mdx-accent-on': '#ffffff'
      },
    '.adit-mdx-editor .adit-mdx-content.adit-mdx-content': {
      background: 'var(--adit-mdx-card) !important',
      caretColor: 'var(--adit-mdx-accent)',
      color: 'var(--adit-mdx-fg) !important',
      fontFamily: hankenStack,
      fontSize: '14px',
      lineHeight: '1.6',
      minHeight: '100%',
      outline: 'none',
      padding: '16px'
    },
    '.adit-mdx-editor .adit-mdx-toolbar.mdxeditor-toolbar': {
      alignItems: 'center',
      alignSelf: 'stretch',
      background: 'var(--adit-mdx-panel-header) !important',
      borderBottom: '1px solid var(--adit-mdx-border) !important',
      borderLeft: '0 !important',
      borderRadius: '0 !important',
      borderRight: '0 !important',
      borderTop: '0 !important',
      boxShadow: 'none !important',
      color: 'var(--adit-mdx-muted) !important',
      display: 'flex',
      flexShrink: '0',
      flexWrap: 'wrap',
      gap: '4px',
      margin: '0 !important',
      maxWidth: '100%',
      minHeight: '38px',
      padding: '6px 16px',
      width: '100%'
    },
    '.adit-mdx-editor .adit-mdx-toolbar button': {
      alignItems: 'center',
      background: 'transparent !important',
      border: '1px solid transparent !important',
      borderRadius: '7px',
      color: 'var(--adit-mdx-muted) !important',
      display: 'inline-flex',
      fontFamily: hankenStack,
      fontSize: '12px',
      fontWeight: '650',
      height: '26px',
      justifyContent: 'center',
      minWidth: '26px',
      padding: '0 7px'
    },
    '.adit-mdx-editor .adit-mdx-toolbar button:hover:not(:disabled)': {
      background: 'var(--adit-mdx-track) !important',
      borderColor: 'var(--adit-mdx-border) !important',
      color: 'var(--adit-mdx-fg) !important'
    },
    '.adit-mdx-editor .adit-mdx-toolbar button[aria-label="Block type"]': {
      justifyContent: 'space-between',
      minWidth: '126px'
    },
    '.adit-mdx-editor .adit-mdx-toolbar button[aria-label="Block type"] span': {
      color: 'inherit !important'
    },
    '.adit-mdx-editor .adit-mdx-toolbar [data-state="on"]': {
      background: 'var(--adit-mdx-track) !important',
      borderColor: 'var(--adit-mdx-border-strong) !important',
      color: 'var(--adit-mdx-fg) !important'
    },
    '.adit-mdx-editor .adit-mdx-toolbar [data-disabled], .adit-mdx-editor .adit-mdx-toolbar [disabled]': {
      opacity: '0.38 !important'
    },
    '.adit-mdx-editor .adit-mdx-toolbar [role="separator"]': {
      background: 'var(--adit-mdx-border) !important',
      height: '18px',
      margin: '0 3px',
      width: '1px'
    },
    '.adit-mdx-editor .adit-mdx-toolbar svg': {
      color: 'var(--adit-mdx-muted) !important',
      height: '16px',
      stroke: 'currentColor !important',
      width: '16px'
    },
    '.adit-mdx-editor .adit-mdx-toolbar [data-state="on"] svg': {
      color: 'var(--adit-mdx-fg) !important'
    },
    '.adit-mdx-editor .adit-mdx-toolbar [disabled] svg': {
      color: 'var(--adit-mdx-faint, var(--adit-mdx-muted)) !important'
    },
    '.adit-mdx-editor .mdxeditor-select-content, .adit-mdx-editor [data-editor-dialog]': {
      background: 'var(--adit-mdx-panel) !important',
      border: '1px solid var(--adit-mdx-border) !important',
      borderRadius: '8px',
      boxShadow: '0 14px 34px rgba(0, 0, 0, 0.28)',
      color: 'var(--adit-mdx-fg) !important',
      fontFamily: hankenStack,
      overflow: 'hidden'
    },
    '.adit-mdx-editor .mdxeditor-select-content [role="option"]': {
      background: 'transparent !important',
      color: 'var(--adit-mdx-muted) !important',
      fontFamily: hankenStack,
      fontSize: '13px',
      fontWeight: '600'
    },
    '.adit-mdx-editor .mdxeditor-select-content [role="option"][data-highlighted], .adit-mdx-editor .mdxeditor-select-content [role="option"][data-state="checked"]':
      {
        background: 'var(--adit-mdx-track) !important',
        color: 'var(--adit-mdx-fg) !important'
      },
    '.adit-mdx-editor [class*="_codeMirrorWrapper_"]': {
      borderColor: 'var(--adit-mdx-border) !important'
    },
    '.adit-mdx-editor [class*="_codeMirrorToolbar_"]': {
      background: 'var(--adit-mdx-panel) !important',
      border: '1px solid var(--adit-mdx-border) !important',
      borderRadius: '7px',
      color: 'var(--adit-mdx-muted) !important'
    },
    '.adit-mdx-editor [class*="_codeMirrorToolbar_"] button': {
      background: 'transparent !important',
      borderColor: 'transparent !important',
      color: 'var(--adit-mdx-muted) !important'
    },
    '.adit-mdx-editor [class*="_codeMirrorToolbar_"] button:hover:not(:disabled)': {
      background: 'var(--adit-mdx-track) !important',
      borderColor: 'var(--adit-mdx-border) !important',
      color: 'var(--adit-mdx-fg) !important'
    },
    '.adit-mdx-editor [class*="_codeMirrorToolbar_"] button span': {
      color: 'inherit !important'
    },
    '.adit-mdx-editor [class*="_codeMirrorToolbar_"] svg': {
      color: 'currentColor !important',
      fill: 'currentColor !important',
      stroke: 'currentColor !important'
    },
    '.adit-mdx-editor .adit-mdx-content p': {
      color: 'var(--adit-mdx-fg) !important',
      margin: '0 0 0.8em'
    },
    '.adit-mdx-editor .adit-mdx-content h1, .adit-mdx-editor .adit-mdx-content h2, .adit-mdx-editor .adit-mdx-content h3, .adit-mdx-editor .adit-mdx-content h4, .adit-mdx-editor .adit-mdx-content h5, .adit-mdx-editor .adit-mdx-content h6, .adit-mdx-editor .adit-mdx-content li':
      {
        color: 'var(--adit-mdx-fg) !important'
      },
    '.adit-mdx-editor .adit-mdx-content blockquote': {
      backgroundColor: 'var(--adit-mdx-panel-header)',
      borderLeft: '3px solid var(--adit-mdx-accent)',
      color: 'var(--adit-mdx-fg-soft)',
      margin: '0 0 1em',
      padding: '8px 12px'
    },
    '.adit-mdx-editor .adit-mdx-content pre': {
      backgroundColor: 'var(--adit-mdx-panel-header)',
      border: '1px solid var(--adit-mdx-border)',
      borderRadius: '8px',
      fontFamily: splineMonoStack,
      overflowX: 'auto',
      padding: '12px'
    },
    '.adit-mdx-editor .cm-editor.cm-editor': {
      background: 'var(--adit-mdx-panel-header) !important',
      color: 'var(--adit-mdx-fg) !important',
      fontFamily: splineMonoStack,
      outline: 'none !important'
    },
    '.adit-mdx-editor .cm-scroller, .adit-mdx-editor .cm-content, .adit-mdx-editor .cm-line': {
      background: 'transparent !important',
      color: 'var(--adit-mdx-fg) !important',
      fontFamily: splineMonoStack
    },
    '.adit-mdx-editor .cm-gutters': {
      background: 'var(--adit-mdx-panel) !important',
      borderColor: 'var(--adit-mdx-border) !important',
      color: 'var(--adit-mdx-muted) !important'
    },
    '.adit-mdx-editor .cm-activeLine, .adit-mdx-editor .cm-activeLineGutter': {
      background: 'var(--adit-mdx-track) !important'
    },
    '.adit-mdx-editor .cm-cursor': {
      borderLeftColor: 'var(--adit-mdx-accent) !important'
    },
    '.adit-mdx-editor .cm-selectionBackground, .adit-mdx-editor .cm-content ::selection': {
      background: 'rgba(209, 138, 94, 0.32) !important'
    },
    '.adit-mdx-editor .cm-matchingBracket': {
      background: 'var(--adit-mdx-track) !important',
      color: 'var(--adit-mdx-fg) !important'
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
          letterSpacing: '0'
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
