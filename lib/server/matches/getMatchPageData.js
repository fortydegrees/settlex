import { getArchivedMatchByMatchId } from "./getArchivedMatchByMatchId.js";
import {
  GAME_NAME,
  getGameServerBaseUrl,
} from "./joinMatchForAccount.js";

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const getMatchPageData = async (
  matchID,
  {
    fetchImpl = fetch,
    baseUrl,
    getArchivedMatchByMatchId: getArchivedMatchByMatchIdImpl = getArchivedMatchByMatchId,
  } = {}
) => {
  if (!matchID) {
    return {
      kind: "missing",
      matchID: matchID ?? null,
    };
  }

  try {
    const response = await fetchImpl(
      `${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (response?.ok) {
      return {
        kind: "live",
        matchID,
        liveMatch: (await readJson(response)) ?? null,
      };
    }
  } catch (error) {
    // Fall through to archive lookup when the live server is unavailable.
  }

  const archivedMatch = await getArchivedMatchByMatchIdImpl(matchID);
  if (archivedMatch) {
    return {
      kind: "archived",
      matchID,
      archivedMatch,
    };
  }

  return {
    kind: "missing",
    matchID,
  };
};
