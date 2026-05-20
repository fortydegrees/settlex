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
  knightDisplayOverride,
  compact = false
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
    <div
      id={`p${player.id}-opponent-box`}
      className={`flex items-start ${
        compact ? "origin-top scale-[0.78]" : ""
      }`}
    >
      <PlayerAvatarStats
        player={player}
        presence={presence}
        core={core}
        coreTopology={coreTopology}
        isMe={false}
        isActive={isActive}
        statusType={statusType}
        knightDisplayOverride={knightDisplayOverride}
        statsPanelClassName={isSeatWarning ? "seat-disconnected-pulse" : ""}
        statsPanelChildren={
          <>
            <div id={`p${player.id}-resources`}>
              <CardStack
                count={resourceCount}
                src={resCardBackIcon}
                alt="Resource cards"
                badgeTone={resourceBadgeTone}
                imageClassName="object-contain"
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
          </>
        }
      />
    </div>
  );
};
