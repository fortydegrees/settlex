import React, { createElement as h } from "react";
import { CATANA_TABLE_BACKGROUND } from "../../theme/backgrounds";

export function LiveMatchLoadingShell() {
  return h(
    "div",
    {
      className:
        "min-h-screen overflow-hidden text-ink-primary",
      style: { background: CATANA_TABLE_BACKGROUND },
    },
    h(
      "div",
      {
        className:
          "mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-ui-4 py-ui-8",
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
                "settlex-ui-pane px-ui-6 py-ui-4 text-center",
            },
            h(
              "div",
              {
                className:
                  "type-action-small text-ink-secondary",
              },
              "Live Match"
            ),
            h(
              "div",
              {
                className: "mt-ui-2 type-title text-ink-primary",
              },
              "Connecting to live match"
            ),
            h(
              "div",
              {
                className: "mt-ui-2 type-body-small text-ink-secondary",
              },
              "Syncing the board and player seat."
            )
          )
        )
      )
    )
  );
}
