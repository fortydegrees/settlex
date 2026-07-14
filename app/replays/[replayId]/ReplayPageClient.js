"use client";

import { createElement as h } from "react";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";
import { PostgameGameBoard } from "../PostgameGameBoard";

export const createReplayPageClient = ({
  PostgameGameBoard: PostgameGameBoardImpl = PostgameGameBoard,
} = {}) =>
  function ReplayPageClient({
    replay,
    frames = [],
    initialFrameIndex = 0,
    initialPerspectivePlayerID = null,
  }) {
    return h(
      "div",
      {
        className: "min-h-screen",
        style: { background: CATANA_TABLE_BACKGROUND },
      },
      h(PostgameGameBoardImpl, {
        initialReplayPayload: { replay, frames },
        initialPerspectivePlayerID,
        initialFrameIndex,
      })
    );
  };

export const ReplayPageClient = createReplayPageClient();
