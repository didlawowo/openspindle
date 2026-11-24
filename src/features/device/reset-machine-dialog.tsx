import { useTranslation } from "react-i18next"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** Asks before Reset reboots the machine's controller. */
export function ResetMachineDialog({
  open,
  onOpenChange,
  onReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: () => void
}) {
  const { t } = useTranslation("device")
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("resetDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("resetDialog.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onOpenChange(false)
              onReset()
            }}
          >
            {t("resetDialog.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
