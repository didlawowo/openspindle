import { useRef } from "react"
import type { CSSProperties } from "react"
import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { DesignRulesSettings } from "./design-rules-settings"

/**
 * The project's settings, a page per subject in its sidebar; Design rules is the only one so
 * far. A page applies its changes on Save.
 */
export function WorkspaceSettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("designRules")
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
        className="h-[min(560px,85vh)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <SidebarProvider
          className="min-h-0 items-stretch"
          style={{ "--sidebar-width": "12rem" } as CSSProperties}
        >
          <Sidebar collapsible="none" className="border-r">
            <SidebarHeader>
              <DialogTitle className="px-2 pt-1">
                {t("settings.title")}
              </DialogTitle>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>
                        <ShieldCheck />
                        <span>{t("settings.page")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
            <header className="flex shrink-0 flex-col gap-1 p-4 pr-10">
              <h2 className="font-heading text-sm font-medium">
                {t("settings.page")}
              </h2>
              <DialogDescription>{t("settings.description")}</DialogDescription>
            </header>
            <DesignRulesSettings onClose={onClose} />
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
