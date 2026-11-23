import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { usePcb } from "./use-pcb"

/** The converter installed on this computer, shared by every PCB operation. */
export function PcbSettings() {
  const { t } = useTranslation("settings")
  const pcb = usePcb()
  const status = pcb.status.data
  const busy =
    pcb.check.isPending || pcb.choose.isPending || pcb.automatic.isPending
  const error =
    pcb.status.error ??
    pcb.check.error ??
    pcb.choose.error ??
    pcb.automatic.error
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="pcb-executable">{t("pcb.executable")}</FieldLabel>
        <Input
          id="pcb-executable"
          readOnly
          value={status?.executable ?? t("pcb.automaticDetection")}
        />
        {/* The converter's own status message comes from the main process and is not translated yet. */}
        <FieldDescription>
          {pcb.status.isPending ? t("pcb.checking") : status?.message}
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => pcb.choose.mutate()}
          >
            {t("pcb.choose")}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => pcb.check.mutate()}
          >
            {pcb.check.isPending ? t("pcb.checkingShort") : t("pcb.checkAgain")}
          </Button>
          {status?.executable && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => pcb.automatic.mutate()}
            >
              {t("pcb.useAutomatic")}
            </Button>
          )}
        </div>
        {error && <FieldError>{error.message}</FieldError>}
      </Field>
    </FieldGroup>
  )
}
