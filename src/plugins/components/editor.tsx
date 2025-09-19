import { Fragment, useEffect, useMemo } from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import * as locales from '@blocknote/core/locales'
import {
  BlockNoteSchema,
  combineByGroup,
  defaultBlockSpecs,
  filterSuggestionItems,
  withPageBreak,
} from '@blocknote/core'
import {
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react'
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from '@blocknote/xl-pdf-exporter'
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as multiColumnLocales,
  withMultiColumn,
} from '@blocknote/xl-multi-column'
import { pdf } from '@react-pdf/renderer'
import '@excalidraw/excalidraw/index.css'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { Note } from '../types'
import { useMyrkat } from '@kevindptr/myrkat-sdk'

const schema = withMultiColumn(
  withPageBreak(
    BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
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
    codeBlock: {
      indentLineWithTab: true,
      defaultLanguage: 'plain',
      supportedLanguages: {
        plain: {
          name: 'Plain Text',
          aliases: ['txt'],
        },
        typescript: {
          name: 'Typescript',
          aliases: ['ts'],
        },
        javascript: {
          name: 'Javascript',
          aliases: ['js'],
        },
        vue: {
          name: 'Vue',
          aliases: ['vue'],
        },
      },
      // TODO: highlighter
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

  return (
    <Fragment>
      <BlockNoteView
        autoFocus
        editor={editor}
        theme="light"
        onChange={() => {
          onChange(JSON.stringify(editor.document))
        }}
      >
        <SuggestionMenuController
          triggerCharacter={'/'}
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </Fragment>
  )
}
