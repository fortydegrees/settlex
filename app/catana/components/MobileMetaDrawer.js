import React, { useCallback, useMemo } from "react";
import { Drawer } from "vaul";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const drawerContentClassName =
  "settlex-ui-pane settlex-ui-feed-drawer fixed inset-x-0 bottom-0 z-[65] mx-auto flex h-[min(52vh,26rem)] min-h-[15rem] w-full max-w-[28rem] flex-col overflow-hidden outline-none select-text";
const drawerTabClassName =
  "settlex-ui-feed-tab settlex-ui-focus min-h-[2.75rem] rounded-pill px-ui-3 py-ui-2 type-action-small transition-colors duration-[var(--settlex-ui-duration-fast)] motion-reduce:transition-none";
const drawerTabActiveClassName =
  "settlex-ui-feed-tab-selected";
const drawerTabIdleClassName =
  "text-ink-secondary hover:bg-surface-hover";

export function MobileMetaDrawer({
  activePanel,
  panels,
  onActivePanelChange,
}) {
  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.id === activePanel) ?? panels[0] ?? null,
    [activePanel, panels]
  );
  const setActivePanel = onActivePanelChange;

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
          aria-describedby="mobile-meta-drawer-description"
          onPointerDownOutside={preserveBoardPointerDown}
          data-meta-mobile-drawer="true"
          data-allow-interaction="true"
        >
          <div className="settlex-ui-feed-header px-ui-3 pb-ui-2.5 pt-ui-2.5">
            <div className="relative flex items-center justify-center">
              <Drawer.Handle className="settlex-ui-feed-handle !my-ui-0 !h-1.5 !w-14" />
            </div>

            <Drawer.Title className="sr-only">Game feed</Drawer.Title>
            <Drawer.Description
              id="mobile-meta-drawer-description"
              className="sr-only"
            >
              Game log and chat feed.
            </Drawer.Description>

            <div
              className="mt-ui-2 grid grid-cols-2 gap-ui-2"
              role="tablist"
              aria-label="Game feed tabs"
            >
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  className={joinClassNames(
                    drawerTabClassName,
                    selectedPanel?.id === panel.id
                      ? drawerTabActiveClassName
                      : drawerTabIdleClassName
                  )}
                  onClick={() => setActivePanel(panel.id)}
                  role="tab"
                  aria-selected={
                    selectedPanel?.id === panel.id ? "true" : "false"
                  }
                  aria-controls={`mobile-meta-panel-${panel.id}`}
                  data-meta-mobile-drawer-tab={panel.id}
                  data-allow-interaction="true"
                >
                  {panel.label}
                </button>
              ))}
            </div>
          </div>

          <div
            id={
              selectedPanel ? `mobile-meta-panel-${selectedPanel.id}` : undefined
            }
            className="min-h-0 flex-1"
            role="tabpanel"
            data-meta-mobile-drawer-panel={selectedPanel.id}
          >
            {selectedPanel ? selectedPanel.renderMobile() : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
