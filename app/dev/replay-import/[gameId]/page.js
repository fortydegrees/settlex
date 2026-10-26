import { notFound } from "next/navigation";
import { ReplayImportClient } from "../../../_features/dev/replay-import/ReplayImportClient";

export default async function LocalReplayPage({ params }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ReplayImportClient gameId={(await params).gameId} />;
}
