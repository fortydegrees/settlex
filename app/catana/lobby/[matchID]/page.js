import { MatchPageClient } from "./MatchPageClient";

export default function CatanaLobbyMatchPage({ params, searchParams }) {
  return (
    <MatchPageClient
      matchID={params.matchID}
      initialPlayerID={searchParams?.playerID ?? null}
    />
  );
}

