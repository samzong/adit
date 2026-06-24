import { EmptyState, Flex, Icon, Stack } from '@chakra-ui/react'

export function AditEmptyState({
  action,
  description,
  icon,
  title
}: {
  action?: JSX.Element
  description: string
  icon: JSX.Element
  title: string
}): JSX.Element {
  return (
    <Flex
      align="center"
      justify="center"
      bg="panel"
      borderColor="border"
      borderRadius="panel"
      borderWidth="1px"
      minH="300px"
    >
      <EmptyState.Root size="md">
        <EmptyState.Content>
          <EmptyState.Indicator>
            <Icon color="accent" boxSize="6">
              {icon}
            </Icon>
          </EmptyState.Indicator>
          <Stack gap="1.5" textAlign="center">
            <EmptyState.Title fontSize="md" fontWeight="700">
              {title}
            </EmptyState.Title>
            <EmptyState.Description color="muted" fontSize="sm" maxW="380px">
              {description}
            </EmptyState.Description>
          </Stack>
          {action}
        </EmptyState.Content>
      </EmptyState.Root>
    </Flex>
  )
}
