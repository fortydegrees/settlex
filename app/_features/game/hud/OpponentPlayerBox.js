import React from "react";
import "./OpponentPlayerBox.css";
import { ResizeRegion } from "../../../ui/ResizeRegion";
import resCardBackIcon from "../../../../public/svgs/cards/resource/card_rescardback.svg";
import devCardBackIcon from "../../../../public/svgs/cards/development/card_devcardback.svg";
import { CardStack } from "../cards/CardStack";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { getOpponentResourceBadgeTone } from "./OpponentPlayerBoxUtils";
import { ReplayHandCards } from "../cards/ReplayHandCards";

const OpponentPlayerBoxComponent = ({
  player,
  presence,
  core,
  coreTopology,
  isActive,
  statusType,
  knightDisplayOverride,
  compact = false,
  revealHand = false,
  themeId,
}) => {
  if (!player) return null;

  const resourceCount = player.resources?.length ?? 0;
  const devCount = player.devCards?.length ?? 0;
  const isSeatWarning =
    presence?.status === "disconnected" || presence?.status === "idle";
  const discardLimit = core?.ruleset?.discardLimit ?? 7;
  const resourceBadgeTone = getOpponentResourceBadgeTone({
    resourceCount,
    discardLimit,
  });
  const isOverLimit = resourceBadgeTone === "danger";
  const dangerPanelClassName =
    !isSeatWarning && isOverLimit ? "settlehex-hud-glass--danger" : "";
  const dangerAvatarClassName =
    !isSeatWarning && isOverLimit
      ? "settlehex-hud-avatar--danger"
      : "";

  return (
    <div
      id={`p${player.id}-opponent-box`}
      className={`flex shrink-0 items-start ${
        revealHand
          ? "opponent-player-box--revealed"
          : compact ? "origin-top scale-[0.78]" : ""
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
        statsPanelClassName={[
          isSeatWarning ? "seat-disconnected-pulse" : "",
          dangerPanelClassName,
        ].filter(Boolean).join(" ")}
        avatarClassName={dangerAvatarClassName}
        statsPanelChildrenClassName={revealHand ? "flex min-w-0 flex-1 items-center justify-start gap-x-ui-3" : undefined}
        statsPanelChildren={
          revealHand ? (
            <ReplayHandCards player={player} themeId={themeId} />
          ) : (
            <ResizeRegion axis="width">
              <div className="flex items-center gap-x-ui-3">
                <div id={`p${player.id}-resources`}>
                  <CardStack
                    count={resourceCount}
                    src={resCardBackIcon}
                    alt="Resource cards"
                    badgeTone={resourceBadgeTone}
                    imageClassName="object-contain"
                  />
                </div>
                <div id={`p${player.id}-devcards`}>
                  <CardStack
                    count={devCount}
                    src={devCardBackIcon}
                    alt="Dev cards"
                  />
                </div>
              </div>
            </ResizeRegion>
          )
        }
      />
    </div>
  );
};

export const OpponentPlayerBox = React.memo(OpponentPlayerBoxComponent);
OpponentPlayerBox.displayName = "OpponentPlayerBox";
