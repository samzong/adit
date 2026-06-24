import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { system } from './theme'

export function Provider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
        {children}
      </ThemeProvider>
    </ChakraProvider>
  )
}
