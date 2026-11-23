import { useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { CircuitBoard, Lock, SlidersHorizontal } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { GeneralSettings } from "./general-settings"
import { PrivacySettings } from "./privacy-settings"
import { PcbSettings } from "@/features/pcb/pcb-settings"

export type SettingsSection = "general" | "pcb" | "privacy"

const SECTIONS: ReadonlyArray<{
  id: SettingsSection
  labelKey: "sections.general" | "sections.pcb" | "sections.privacy"
  icon: LucideIcon
}> = [
  { id: "general", labelKey: "sections.general", icon: SlidersHorizontal },
  { id: "pcb", labelKey: "sections.pcb", icon: CircuitBoard },
  { id: "privacy", labelKey: "sections.privacy", icon: Lock },
]

function SectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case "general":
      return <GeneralSettings />
    case "pcb":
      return <PcbSettings />
    case "privacy":
      return <PrivacySettings />
  }
}

/** The app's settings, a page per subject in its sidebar. Changes apply at once. */
export function SettingsDialog({
  section: initialSection = "general",
  onClose,
}: {
  section?: SettingsSection
  onClose: () => void
}) {
  const { t } = useTranslation("settings")
  const [section, setSection] = useState(initialSection)
  const current = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0]
  const page = useRef<HTMLElement>(null)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {/* Opening focuses the page, not the sidebar's first item, which would show its focus ring. */}
      <DialogContent
        initialFocus={page}
        className="h-[min(480px,85vh)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SidebarProvider
          className="min-h-0 items-stretch"
          style={{ "--sidebar-width": "12rem" } as CSSProperties}
        >
          <Sidebar collapsible="none" className="border-r">
            <SidebarHeader>
              <DialogTitle className="px-2 pt-1">{t("title")}</DialogTitle>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton
                          isActive={id === section}
                          onClick={() => setSection(id)}
                        >
                          <Icon />
                          <span>{t(labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main
            ref={page}
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col outline-none"
          >
            <header className="shrink-0 p-4 pr-10">
              <h2 className="font-heading text-sm font-medium">
                {t(current.labelKey)}
              </h2>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <SectionContent section={current.id} />
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
