export const META_PANEL_FRAME_CLASS_NAME =
  "settlex-ui-hud relative flex h-full flex-col overflow-hidden select-none";

export const META_PANEL_GLASS_STYLE = {
  // The frame owns the material and its transparency fallback. Keep this
  // exported overlay hook for existing joined meta-rail consumers.
  background: "transparent",
};

export const META_PANEL_HEADER_CLASS_NAME =
  "relative z-10 flex min-h-[2.75rem] shrink-0 items-center justify-between gap-ui-2 border-b border-decoration-edge px-ui-3.5 type-action-small text-ink-secondary";
