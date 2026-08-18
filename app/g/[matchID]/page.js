import GMatchPage from "./page-content";
import { createMatchMetadata } from "../../metadata.js";

export function generateMetadata({ params }) {
  return createMatchMetadata(params?.matchID);
}

export default function MatchRoutePage({ params, searchParams }) {
  return GMatchPage({ params, searchParams });
}
