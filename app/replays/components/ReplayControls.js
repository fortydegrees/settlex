import { createElement as h } from "react";

export function ReplayControls({
  frameIndex,
  frameCount,
  onFrameChange,
  onPrevious,
  onNext,
}) {
  const maxIndex = Math.max(0, frameCount - 1);
  const currentStep = Math.min(frameIndex + 1, Math.max(frameCount, 1));

  return h(
    "section",
    {
      className:
        "rounded-2xl bg-white/70 p-4 shadow-xl ring-1 ring-white/60 backdrop-blur-sm",
    },
    h(
      "div",
      {
        className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      },
      h(
        "div",
        null,
        h(
          "p",
          {
            className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-600",
          },
          "Replay controls"
        ),
        h(
          "p",
          {
            className: "mt-1 text-sm font-semibold text-slate-900",
          },
          `Step ${currentStep} of ${Math.max(frameCount, 1)}`
        )
      ),
      h(
        "div",
        {
          className: "flex items-center gap-2",
        },
        h(
          "button",
          {
            type: "button",
            onClick: onPrevious,
            disabled: frameIndex <= 0,
            className:
              "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-white/70 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400",
          },
          "Previous"
        ),
        h(
          "button",
          {
            type: "button",
            onClick: onNext,
            disabled: frameIndex >= maxIndex,
            className:
              "rounded-full bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:bg-slate-300",
          },
          "Next"
        )
      )
    ),
    h("input", {
      className: "mt-4 w-full accent-lime-500",
      type: "range",
      min: 0,
      max: maxIndex,
      value: Math.min(frameIndex, maxIndex),
      onChange: (event) => onFrameChange(Number(event.target.value)),
    })
  );
}
