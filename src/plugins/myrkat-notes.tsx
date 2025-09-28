import { Fragment } from 'react'
import { MyrkatNotesMain } from './main'
import { MyrkatNotesSidebar } from './sidebar'

export const MyrkatNotes = () => {
  return (
    <Fragment>
      <MyrkatNotesSidebar />
      <MyrkatNotesMain />
    </Fragment>
  )
}
