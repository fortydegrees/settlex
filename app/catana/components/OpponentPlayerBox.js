import React from "react";
import resCardBackIcon from "../../../public/svgs/card_rescardback.svg";
import devCardBackIcon from "../../../public/svgs/card_devcardback.svg";
import { CardStack } from "./CardStack";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { getOpponentResourceBadgeTone } from "./OpponentPlayerBoxUtils";

export const OpponentPlayerBox = ({ player, core, coreTopology }) => {
  if (!player) return null;

  const resourceCount = player.resources?.length ?? 0;
  const devCount = player.devCards?.length ?? 0;
  const discardLimit = core?.ruleset?.discardLimit ?? 7;
  const resourceBadgeTone = getOpponentResourceBadgeTone({
    resourceCount,
    discardLimit,
  });

  return (
    <div className="flex items-center">
      <PlayerAvatarStats
        player={player}
        core={core}
        coreTopology={coreTopology}
        isMe={false}
      />
      <div className="ml-2 bg-blue-200 bg-opacity-50 rounded-md flex h-20 px-2 gap-x-2 items-center ring-2 ring-slate-300">
        <CardStack
          count={resourceCount}
          src={resCardBackIcon}
          alt="Resource cards"
          badgeTone={resourceBadgeTone}
        />
        <CardStack
          count={devCount}
          src={devCardBackIcon}
          alt="Dev cards"
        />
      </div>
    </div>
  );
};
