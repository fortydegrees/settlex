import React, { useCallback, useMemo } from "react";
import { Drawer } from "vaul";
import { Tabs, TabsList, TabsPanel } from "../../../ui/Tabs";

const drawerContentClassName =
  "settlehex-ui-pane settlehex-ui-feed-drawer fixed inset-x-0 bottom-0 z-[65] mx-auto flex h-[min(52vh,26rem)] min-h-[15rem] w-full max-w-[28rem] flex-col overflow-hidden outline-none select-text";
export function MobileMetaDrawer({
  activePanel,
  panels,
  onActivePanelChange,
}) {
  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.id === activePanel) ?? panels[0] ?? null,
    [activePanel, panels]
  );

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (nextOpen) return;
      onActivePanelChange(null);
    },
    [onActivePanelChange]
  );
  const preserveBoardPointerDown = useCallback((event) => {
    // Vaul's non-modal path still prevents outside pointer-down by default,
    // which stops the board pan gesture from starting behind this tray.
    event.preventDefault = () => {};
  }, []);

  return (
    <Drawer.Root
      open={Boolean(activePanel)}
      onOpenChange={handleOpenChange}
      direction="bottom"
      dismissible={true}
      modal={false}
      noBodyStyles={true}
    >
      <Drawer.Portal>
        <Drawer.Content
          className={drawerContentClassName}
          onPointerDownOutside={preserveBoardPointerDown}
          data-meta-mobile-drawer="true"
          data-allow-interaction="true"
        >
          <Tabs value={selectedPanel?.id ?? null} onValueChange={onActivePanelChange} className="flex min-h-0 flex-1 flex-col">
            <div className="settlehex-ui-feed-header px-ui-3 pb-ui-2.5 pt-ui-2.5">
              <div className="relative flex items-center justify-center">
                <Drawer.Handle className="settlehex-ui-feed-handle !my-ui-0 !h-1.5 !w-14" />
              </div>

              <Drawer.Title className="sr-only">Game feed</Drawer.Title>
              <Drawer.Description
                className="sr-only"
              >
                Game log and chat feed.
              </Drawer.Description>

              <TabsList label="Game feed tabs" className="mt-ui-2"
                options={panels.map(panel => ({ value: panel.id, label: panel.label, disabled: panel.disabled }))}
                data-allow-interaction="true" />
            </div>

            {panels.map(panel => (
              <TabsPanel key={panel.id} value={panel.id} className="flex-1"
                data-meta-mobile-drawer-panel={panel.id}>
                {selectedPanel?.id === panel.id ? panel.renderMobile() : null}
              </TabsPanel>
            ))}
          </Tabs>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
