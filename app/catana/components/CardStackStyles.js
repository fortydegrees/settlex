const BADGE_BASE =
  "absolute -top-2 -right-2 z-20 h-5 min-w-[1.25rem] rounded-full px-1 text-xs font-semibold ring-2 ring-white flex items-center justify-center";

export const getBadgeClasses = (tone = "default") => {
  if (tone === "danger") {
    return `${BADGE_BASE} bg-rose-500 text-white`;
  }
  return `${BADGE_BASE} bg-blue-50 text-slate-700`;
};
