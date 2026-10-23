"use client";

import { createElement as h, useMemo } from "react";
import { SETTLEHEX_TABLE_BACKGROUND } from "../theme/backgrounds";
import { PostgameGameBoard } from "./PostgameGameBoard";
import { hydrateArchivedReplayPayload } from "../../../lib/replays/archivedReplayPayload.js";

export const createReplayPageClient = ({
  PostgameGameBoard: PostgameGameBoardImpl = PostgameGameBoard,
} = {}) =>
  function ReplayPageClient({
    replay,
    frames = null,
    record = null,
    initialFrameIndex = 0,
    initialPerspectivePlayerID = null,
  }) {
    const initialReplayPayload = useMemo(
      () => hydrateArchivedReplayPayload({ replay, ...(record ? { record } : { frames: frames ?? [] }) }),
      [replay, frames, record]
    );

    return h(
      "div",
      {
        className: "min-h-screen",
        style: { background: SETTLEHEX_TABLE_BACKGROUND },
      },
      h(PostgameGameBoardImpl, {
        initialReplayPayload,
        initialPerspectivePlayerID,
        initialFrameIndex,
      })
    );
  };

export const ReplayPageClient = createReplayPageClient();
