import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { system } from './theme'

interface ProviderProps {
  children: ReactNode
}

export function Provider({ children }: ProviderProps): JSX.Element {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
        {children}
      </ThemeProvider>
    </ChakraProvider>
  )
}
