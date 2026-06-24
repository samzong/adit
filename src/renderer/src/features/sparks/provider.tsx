import { Box, HStack, Text } from '@chakra-ui/react'
import type { ProviderId } from '../../../../shared/types'

export const providerDefs: Array<{ id: ProviderId; label: string }> = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'grok', label: 'Grok' }
]
export const providerLabels: Record<ProviderId, string> = {
  chatgpt: 'ChatGPT',
  grok: 'Grok'
}
export const providerColors: Record<ProviderId, { fg: string; bg: string; border: string }> = {
  chatgpt: { fg: 'providerChatgptFg', bg: 'providerChatgptBg', border: 'providerChatgptBorder' },
  grok: { fg: 'providerGrokFg', bg: 'providerGrokBg', border: 'providerGrokBorder' }
}

export function ProviderMark({ provider, boxSize = '3.5' }: { provider: ProviderId; boxSize?: string }): JSX.Element {
  if (provider === 'chatgpt') {
    return (
      <Box boxSize={boxSize} color="currentColor" display="block">
        <svg aria-hidden="true" fill="currentColor" height="100%" viewBox="0 0 16 16" width="100%">
          <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
        </svg>
      </Box>
    )
  }

  return (
    <Box boxSize={boxSize} color="currentColor" display="block">
      <svg aria-hidden="true" fill="currentColor" height="100%" viewBox="0 0 512 509.641" width="100%">
        <path d="M213.235 306.019l178.976-180.002v.169l51.695-51.763c-.924 1.32-1.86 2.605-2.785 3.89-39.281 54.164-58.46 80.649-43.07 146.922l-.09-.101c10.61 45.11-.744 95.137-37.398 131.836-46.216 46.306-120.167 56.611-181.063 14.928l42.462-19.675c38.863 15.278 81.392 8.57 111.947-22.03 30.566-30.6 37.432-75.159 22.065-112.252-2.92-7.025-11.67-8.795-17.792-4.263l-124.947 92.341zm-25.786 22.437-.033.034L68.094 435.217c7.565-10.429 16.957-20.294 26.327-30.149 26.428-27.803 52.653-55.359 36.654-94.302-21.422-52.112-8.952-113.177 30.724-152.898 41.243-41.254 101.98-51.661 152.706-30.758 11.23 4.172 21.016 10.114 28.638 15.639l-42.359 19.584c-39.44-16.563-84.629-5.299-112.207 22.313-37.298 37.308-44.84 102.003-1.128 143.81z" />
      </svg>
    </Box>
  )
}

export function ProviderPill({ provider }: { provider: ProviderId }): JSX.Element {
  const colors = providerColors[provider]

  return (
    <HStack
      alignSelf="flex-start"
      bg={colors.bg}
      borderColor={colors.border}
      borderRadius="full"
      borderWidth="1px"
      color={colors.fg}
      gap="1.5"
      pl="2"
      pr="2.5"
      py="1"
    >
      <ProviderMark provider={provider} boxSize="3" />
      <Text fontSize="11px" fontWeight="600" letterSpacing="0.03em">
        {providerLabels[provider]}
      </Text>
    </HStack>
  )
}
