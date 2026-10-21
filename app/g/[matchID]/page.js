import GMatchPage from "./page-content";
import { createMatchMetadata } from "../../metadata.js";

export async function generateMetadata({ params }) {
  params = await params;
  return createMatchMetadata(params?.matchID);
}

export default function MatchRoutePage({ params, searchParams }) {
  return GMatchPage({ params, searchParams });
}
