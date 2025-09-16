import { Dialog, DialogContent } from './ui/dialog'
import { useDialog } from '@/context/dialog-provider'

export const DialogWrapper = () => {
  const { open, setOpen, content } = useDialog()

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <DialogContent
        className="min-w-fit"
        onInteractOutside={(e) => {
          e.preventDefault()
        }}
      >
        {content}
      </DialogContent>
    </Dialog>
  )
}
