import '@mdxeditor/editor/style.css'
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeMirrorPlugin,
  codeBlockPlugin,
  diffSourcePlugin,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin
} from '@mdxeditor/editor'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import type { MarkdownDocumentEditorHandle } from './markdown-document-editor'

const codeBlockLanguages = {
  bash: 'Bash',
  css: 'CSS',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  plaintext: 'Plain text',
  ts: 'TypeScript',
  tsx: 'TSX'
}

function MarkdownEditorToolbar(): JSX.Element {
  return (
    <DiffSourceToggleWrapper options={['rich-text', 'source']}>
      <UndoRedo />
      <Separator />
      <BlockTypeSelect />
      <Separator />
      <BoldItalicUnderlineToggles />
      <CodeToggle />
      <Separator />
      <ListsToggle options={['bullet', 'number', 'check']} />
      <Separator />
      <CreateLink />
      <InsertCodeBlock />
      <InsertThematicBreak />
    </DiffSourceToggleWrapper>
  )
}

export function createMarkdownEditorPlugins(): ReturnType<typeof headingsPlugin>[] {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: 'plaintext' }),
    codeMirrorPlugin({ autoLoadLanguageSupport: false, codeBlockLanguages }),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({
      toolbarClassName: 'adit-mdx-toolbar',
      toolbarContents: () => <MarkdownEditorToolbar />
    })
  ]
}

export const MarkdownEditor = forwardRef<MarkdownDocumentEditorHandle, MarkdownEditorProps>(function MarkdownEditor(
  { documentId, markdown, onChange },
  ref
): JSX.Element {
  const editorPlugins = useMemo(createMarkdownEditorPlugins, [])
  const editorRef = useRef<MDXEditorMethods>(null)

  useImperativeHandle(
    ref,
    () => ({
      insertMarkdown: (value) => {
        const editor = editorRef.current
        if (!editor) {
          return false
        }

        editor.focus(() => editor.insertMarkdown(value), { defaultSelection: 'rootEnd', preventScroll: true })
        return true
      }
    }),
    []
  )

  return (
    <MDXEditor
      className="adit-mdx-editor"
      contentEditableClassName="adit-mdx-content"
      key={documentId}
      markdown={markdown}
      plugins={editorPlugins}
      ref={editorRef}
      onChange={onChange}
    />
  )
})

interface MarkdownEditorProps {
  documentId: string
  markdown: string
  onChange: (markdown: string) => void
}
