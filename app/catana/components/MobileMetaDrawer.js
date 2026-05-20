import React, { useCallback, useMemo } from "react";
import { Drawer } from "vaul";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const drawerContentClassName =
  "fixed inset-x-0 bottom-0 z-[65] mx-auto flex h-[min(52vh,26rem)] min-h-[15rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-t-[1.55rem] border border-white/[0.56] bg-[linear-gradient(180deg,rgba(219,234,254,0.94),rgba(191,219,254,0.86))] shadow-[0_-28px_70px_-38px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.46)] ring-1 ring-white/35 backdrop-blur-2xl outline-none select-text";
const drawerTabClassName =
  "rounded-[0.95rem] border px-3 py-2 text-sm font-extrabold transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/80 motion-reduce:transition-none";
const drawerTabActiveClassName =
  "border-white/[0.78] bg-white/[0.72] text-slate-800 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.66),inset_0_1px_0_rgba(255,255,255,0.58)]";
const drawerTabIdleClassName =
  "border-white/[0.38] bg-white/[0.26] text-slate-700 hover:border-white/[0.58] hover:bg-white/[0.4]";

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
          <div className="border-b border-white/30 bg-white/[0.18] px-3 pb-2.5 pt-2.5">
            <div className="relative flex items-center justify-center">
              <Drawer.Handle className="!my-0 !h-1.5 !w-14 !rounded-full !bg-slate-500/36" />
            </div>

            <Drawer.Title className="sr-only">Game feed</Drawer.Title>
            <Drawer.Description
              id="mobile-meta-drawer-description"
              className="sr-only"
            >
              Game log and chat feed.
            </Drawer.Description>

            <div
              className="mt-2 grid grid-cols-2 gap-2"
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
