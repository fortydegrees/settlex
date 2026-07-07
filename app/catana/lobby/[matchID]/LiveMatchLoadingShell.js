import React, { createElement as h } from "react";
import { CATANA_TABLE_BACKGROUND } from "../../theme/backgrounds";

export function LiveMatchLoadingShell() {
  return h(
    "div",
    {
      className:
        "min-h-screen overflow-hidden text-slate-900",
      style: { background: CATANA_TABLE_BACKGROUND },
    },
    h(
      "div",
      {
        className:
          "mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8",
      },
      h(
        "div",
        {
          className: "relative aspect-square w-full max-w-[min(88vw,88vh)]",
        },
        h("img", {
          src: "/svgs/board_underlay_standard.svg",
          alt: "",
          "aria-hidden": "true",
          loading: "eager",
          fetchPriority: "high",
          draggable: false,
          className:
            "absolute inset-0 h-full w-full select-none object-contain opacity-95",
        }),
        h(
          "div",
          {
            className: "absolute inset-0 flex items-center justify-center",
          },
          h(
            "div",
            {
              className:
                "rounded-2xl bg-white/78 px-6 py-4 text-center shadow-xl ring-1 ring-white/80 backdrop-blur-sm",
            },
            h(
              "div",
              {
                className:
                  "text-xs font-semibold uppercase tracking-[0.24em] text-slate-600",
              },
              "Live Match"
            ),
            h(
              "div",
              {
                className: "mt-2 text-xl font-bold text-slate-900",
              },
              "Connecting to live match"
            ),
            h(
              "div",
              {
                className: "mt-2 text-sm text-slate-700",
              },
              "Syncing the board and player seat."
            )
          )
        )
      )
    )
  );
}
