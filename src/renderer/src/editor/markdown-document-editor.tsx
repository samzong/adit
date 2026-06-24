import { Box } from '@chakra-ui/react'
import { forwardRef, lazy, Suspense, useImperativeHandle, useRef } from 'react'

const LazyMarkdownEditor = lazy(() =>
  import('./markdown-editor').then((module) => ({ default: module.MarkdownEditor }))
)

export interface MarkdownDocumentEditorHandle {
  insertMarkdown: (markdown: string) => boolean
}

export const MarkdownDocumentEditor = forwardRef<MarkdownDocumentEditorHandle, MarkdownDocumentEditorProps>(
  function MarkdownDocumentEditor({ documentId, markdown, onChange }, ref): JSX.Element {
    const editorRef = useRef<MarkdownDocumentEditorHandle>(null)

    useImperativeHandle(
      ref,
      () => ({
        insertMarkdown: (value) => editorRef.current?.insertMarkdown(value) ?? false
      }),
      []
    )

    return (
      <Box className="adit-mdx-shell" flex="1" minH="0" overflow="hidden">
        <Suspense fallback={<Box bg="cardBg" h="full" />}>
          <LazyMarkdownEditor ref={editorRef} documentId={documentId} markdown={markdown} onChange={onChange} />
        </Suspense>
      </Box>
    )
  }
)

interface MarkdownDocumentEditorProps {
  documentId: string
  markdown: string
  onChange: (markdown: string) => void
}
