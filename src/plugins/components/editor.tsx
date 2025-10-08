import { codeBlockOptions } from '@blocknote/code-block'
import {
  BlockNoteSchema,
  combineByGroup,
  createCodeBlockSpec,
  defaultBlockSpecs,
  filterSuggestionItems,
  withPageBreak,
} from '@blocknote/core'
import * as locales from '@blocknote/core/locales'
import { BlockNoteView } from '@blocknote/shadcn'
import {
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react'
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as multiColumnLocales,
  withMultiColumn,
} from '@blocknote/xl-multi-column'
import {
  pdfDefaultSchemaMappings,
  PDFExporter,
} from '@blocknote/xl-pdf-exporter'
import { useMyrkat, useTheme } from '@kevindptr/myrkat-sdk/hooks'
import { pdf } from '@react-pdf/renderer'
import { Fragment, useEffect, useMemo } from 'react'
import { Note } from '../types'

import '@blocknote/core/fonts/inter.css'
import '@blocknote/shadcn/style.css'

const schema = withMultiColumn(
  withPageBreak(
    BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        codeBlock: createCodeBlockSpec(codeBlockOptions),
      },
    }),
  ),
)

export const Editor = ({
  note,
  onChange,
}: {
  note: Note
  onChange: (content: string) => void
}) => {
  const { events } = useMyrkat()

  const editor = useCreateBlockNote({
    schema,
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...locales.en,
      multi_column: multiColumnLocales.en,
    },
    initialContent: note.content ? JSON.parse(note.content) : undefined,
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
  })

  const getSlashMenuItems = useMemo(
    () => async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getPageBreakReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor),
        ),
        query,
      ),
    [editor],
  )

  const onDownloadClick = async () => {
    const exporter = new PDFExporter(editor.schema, pdfDefaultSchemaMappings)
    const pdfDocument = await exporter.toReactPDFDocument(editor.document)

    const blob = await pdf(pdfDocument).toBlob()

    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `${note.title}.pdf`

    document.body.appendChild(link)

    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    )

    link.remove()

    window.URL.revokeObjectURL(link.href)
  }

  useEffect(() => {
    events.subscribe('note:export-pdf', onDownloadClick)

    return () => events.unsubscribe('note:export-pdf', onDownloadClick)
  }, [note, events])

  const { theme } = useTheme()
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const isDark = mediaQuery.matches

  return (
    <Fragment>
      <BlockNoteView
        editor={editor}
        theme={
          theme && theme === 'system'
            ? isDark
              ? 'dark'
              : 'light'
            : (theme! as 'light' | 'dark')
        }
        onChange={() => {
          onChange(JSON.stringify(editor.document))
        }}
        className="[--bn-colors-editor-background:bg-background]!"
      >
        <SuggestionMenuController
          triggerCharacter={'/'}
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </Fragment>
  )
}
