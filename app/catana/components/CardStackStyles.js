const BADGE_BASE =
  "absolute z-20 h-5 min-w-[1.25rem] rounded-pill px-ui-1 type-hud-stack-count ring-2 ring-surface-selected flex items-center justify-center";

const BADGE_POSITIONS = {
  corner: "top-0 right-0 -translate-y-1/2 translate-x-1/2",
  inset: "top-1 right-1",
};

export const getBadgeClasses = (tone = "default", position = "corner") => {
  const placement = BADGE_POSITIONS[position] ?? BADGE_POSITIONS.corner;
  if (tone === "danger") {
    return `${BADGE_BASE} ${placement} bg-surface-hud-badge-danger text-ink-hud-badge-danger`;
  }
  return `${BADGE_BASE} ${placement} bg-surface-hud-badge-default text-ink-hud-badge-default`;
};
