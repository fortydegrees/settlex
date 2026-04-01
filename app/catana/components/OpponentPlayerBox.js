import React from "react";
import resCardBackIcon from "../../../public/svgs/card_rescardback.svg";
import devCardBackIcon from "../../../public/svgs/card_devcardback.svg";
import { CardStack } from "./CardStack";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { getOpponentResourceBadgeTone } from "./OpponentPlayerBoxUtils";

export const OpponentPlayerBox = ({
  player,
  presence,
  core,
  coreTopology,
  isActive,
  statusType
}) => {
  if (!player) return null;

  const resourceCount = player.resources?.length ?? 0;
  const devCount = player.devCards?.length ?? 0;
  const stackMotionClass =
    "transition-[width] duration-200 ease-out motion-reduce:transition-none";
  const isDisconnected = presence?.status === "disconnected";
  const discardLimit = core?.ruleset?.discardLimit ?? 7;
  const resourceBadgeTone = getOpponentResourceBadgeTone({
    resourceCount,
    discardLimit,
  });

  return (
    <div className="flex items-center">
      <PlayerAvatarStats
        player={player}
        presence={presence}
        core={core}
        coreTopology={coreTopology}
        isMe={false}
        isActive={isActive}
        statusType={statusType}
      />
      <div
        className={`ml-2 bg-blue-200 bg-opacity-50 rounded-md flex h-20 px-2 gap-x-2 items-center ring-2 ring-slate-300 ${
          isDisconnected ? "seat-disconnected-panel seat-disconnect-pulse" : ""
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
        <CardStack
          count={devCount}
          src={devCardBackIcon}
          alt="Dev cards"
          className={stackMotionClass}
        />
      </div>
    </div>
  );
};
