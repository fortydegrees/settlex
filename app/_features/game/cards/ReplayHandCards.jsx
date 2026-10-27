import React from "react";
import { StackedResourceCount } from "./StackedResourceCount";
import { CardStack } from "./CardStack";
import { DevCardDisplay } from "./DevCardDisplay";
import { DEV_CARD_SVGS } from "./devCardDisplayUtils";
import { RESOURCE_ICON_FILES_BY_RESOURCE } from "../../theme/themes";
import resCardBackIcon from "../../../../public/svgs/cards/resource/card_rescardback.svg";
import devCardBackIcon from "../../../../public/svgs/cards/development/card_devcardback.svg";

export function ReplayHandCards({ player, themeId }) {
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

  // Resources never scroll out of view. Extra cards have a separate bounded bay.
  return (
    <div aria-label={`${player.name ?? "Player"} hand`} className="replay-hand">
      <div id={`p${player.id}-resources`} className="replay-hand__resources" aria-label="Resource cards">
        {resources.map((resource) => (
          <StackedResourceCount key={resource} resource={resource} count={counts[resource]} playerId={player.id} themeId={themeId} />
        ))}
      </div>
      {(unknownResources > 0 || devCards.length > 0) && (
        <div tabIndex={0} onKeyDown={(event) => event.stopPropagation()} className="replay-hand__extra settlehex-ui-focus" aria-label="Additional hand cards">
          {unknownResources > 0 && <CardStack count={unknownResources} src={resCardBackIcon} alt="Unknown resource cards" />}
          {devCards.length > 0 && (
            <div className="flex shrink-0 items-center gap-ui-3" aria-label="Development cards">
              {knownDevCards.length > 0 && <DevCardDisplay cards={knownDevCards} playerId={player.id} showCountBadge={false} embedded />}
              {unknownDevCards > 0 && (
                <div title="These card identities are unavailable in this recording.">
                  <CardStack count={unknownDevCards} src={devCardBackIcon} alt="Development card identity unavailable in this recording" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
