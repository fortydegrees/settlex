import React from "react";
import resCardBackIcon from "../../../public/svgs/cards/resource/card_rescardback.svg";
import devCardBackIcon from "../../../public/svgs/cards/development/card_devcardback.svg";
import { CardStack } from "./CardStack";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { getOpponentResourceBadgeTone } from "./OpponentPlayerBoxUtils";

export const OpponentPlayerBox = ({
  player,
  presence,
  core,
  coreTopology,
  isActive,
  statusType,
  knightDisplayOverride
}) => {
  if (!player) return null;

  const resourceCount = player.resources?.length ?? 0;
  const devCount = player.devCards?.length ?? 0;
  const stackMotionClass =
    "transition-[width] duration-200 ease-out motion-reduce:transition-none";
  const isSeatWarning =
    presence?.status === "disconnected" || presence?.status === "idle";
  const discardLimit = core?.ruleset?.discardLimit ?? 7;
  const resourceBadgeTone = getOpponentResourceBadgeTone({
    resourceCount,
    discardLimit,
  });

  return (
    <div id={`p${player.id}-opponent-box`} className="flex items-start">
      <PlayerAvatarStats
        player={player}
        presence={presence}
        core={core}
        coreTopology={coreTopology}
        isMe={false}
        isActive={isActive}
        statusType={statusType}
        knightDisplayOverride={knightDisplayOverride}
      />
      <div
        className={`ml-2 rounded-md flex h-20 px-2 gap-x-2 items-center ring-2 ${
          isSeatWarning
            ? "bg-rose-100/80 ring-white/60 seat-disconnected-panel seat-disconnected-pulse"
            : "bg-blue-200 bg-opacity-50 ring-white/60"
        }`}
      >
        <div id={`p${player.id}-resources`}>
          <CardStack
            count={resourceCount}
            src={resCardBackIcon}
            alt="Resource cards"
            badgeTone={resourceBadgeTone}
            className={stackMotionClass}
          />
        </div>
        <div id={`p${player.id}-devcards`}>
          <CardStack
            count={devCount}
            src={devCardBackIcon}
            alt="Dev cards"
            className={stackMotionClass}
          />
        </div>
      </div>
    </div>
  );
};
