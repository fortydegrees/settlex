import React from "react";
import { CardIcon } from "../../catana/components/PlayerActionContainer";
import { CardStack } from "../../catana/components/CardStack";
import { DevCardDisplay } from "../../catana/components/DevCardDisplay";
import { DEV_CARD_SVGS } from "../../catana/components/devCardDisplayUtils";
import { RESOURCE_ICON_FILES_BY_RESOURCE } from "../../catana/theme/themes";
import resCardBackIcon from "../../../public/svgs/cards/resource/card_rescardback.svg";
import devCardBackIcon from "../../../public/svgs/cards/development/card_devcardback.svg";

export function ReplayHandCards({ player, themeId, compact = false }) {
  const resources = Object.keys(RESOURCE_ICON_FILES_BY_RESOURCE);
  const counts = Object.fromEntries(resources.map((resource) => [resource, 0]));
  let unknownResources = 0;
  for (const resource of player.resources ?? []) {
    if (Object.hasOwn(counts, resource)) counts[resource] += 1;
    else unknownResources += 1;
  }
  const devCards = player.devCards ?? [];
  const knownDevCards = devCards.filter((card) => Object.hasOwn(DEV_CARD_SVGS, card));
  const unknownDevCards = devCards.length - knownDevCards.length;

  return (
    <div tabIndex={0} aria-label={`${player.name ?? "Player"} hand`} className={`settlex-ui-focus w-40 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
      <div className={`flex w-max items-center ${compact ? "py-ui-1" : "py-ui-4"} pr-ui-4`}>
        <div id={`p${player.id}-resources`} className={`relative flex ${compact ? "h-12" : "h-20"} items-end ${compact ? "" : "pl-ui-4 pr-ui-3"}`} aria-label="Resource cards">
          <div className="mb-ui-4 flex self-end">
            {resources.map((resource, index) => (
              <CardIcon key={resource} resource={resource} resourceCount={counts[resource]} player={player.id} themeId={themeId} compact={compact} isLast={index === resources.length - 1} />
            ))}
          </div>
          {unknownResources > 0 && <CardStack count={unknownResources} src={resCardBackIcon} alt="Unknown resource cards" className="ml-ui-3 self-center" />}
        </div>
        {devCards.length > 0 && (
          <div className="flex shrink-0 items-center" aria-label="Development cards">
            <span className="catana-hud-divider mr-ui-4 h-14 w-px shrink-0 rounded-pill" aria-hidden="true" />
            {knownDevCards.length > 0 && <DevCardDisplay cards={knownDevCards} playerId={player.id} showCountBadge={false} embedded />}
            {unknownDevCards > 0 && (
              <div title="These card identities are unavailable in this recording.">
                <CardStack count={unknownDevCards} src={devCardBackIcon} alt="Development card identity unavailable in this recording" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
