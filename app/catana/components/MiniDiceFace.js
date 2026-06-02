import React from "react";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const pipMap = {
  1: [{ cx: 50, cy: 50 }],
  2: [
    { cx: 70, cy: 30 },
    { cx: 30, cy: 70 },
  ],
  3: [
    { cx: 70, cy: 30 },
    { cx: 50, cy: 50 },
    { cx: 30, cy: 70 },
  ],
  4: [
    { cx: 30, cy: 30 },
    { cx: 70, cy: 30 },
    { cx: 30, cy: 70 },
    { cx: 70, cy: 70 },
  ],
  5: [
    { cx: 30, cy: 30 },
    { cx: 70, cy: 30 },
    { cx: 50, cy: 50 },
    { cx: 30, cy: 70 },
    { cx: 70, cy: 70 },
  ],
  6: [
    { cx: 30, cy: 28 },
    { cx: 70, cy: 28 },
    { cx: 30, cy: 50 },
    { cx: 70, cy: 50 },
    { cx: 30, cy: 72 },
    { cx: 70, cy: 72 },
  ],
};

export function MiniDiceFace({
  value,
  className = "",
  pipClassName = "fill-slate-950",
  withShadow = true,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}) {
  const face = Number(value);
  const pips = pipMap[face];
  if (!pips) return null;
  const isHidden = ariaHidden === true || ariaHidden === "true";

  return React.createElement(
    "span",
    {
      className: joinClassNames(
        "inline-flex h-6 w-6 items-center justify-center rounded-[0.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.96))] ring-1 ring-sky-100/85",
        withShadow &&
          "shadow-[0_5px_12px_-7px_rgba(15,23,42,0.82),inset_0_1px_0_rgba(255,255,255,0.92)]",
        className
      ),
      role: isHidden ? undefined : "img",
      "aria-label": isHidden ? undefined : ariaLabel ?? `Die ${face}`,
      "aria-hidden": ariaHidden,
      title: isHidden ? undefined : `Die ${face}`,
    },
    React.createElement(
      "svg",
      {
        viewBox: "0 0 100 100",
        className: "h-[82%] w-[82%]",
        "aria-hidden": "true",
      },
      pips.map((pip) =>
        React.createElement("circle", {
          key: `${pip.cx}-${pip.cy}`,
          className: pipClassName,
          r: "8",
          cx: pip.cx,
          cy: pip.cy,
        })
      )
    )
  );
}
