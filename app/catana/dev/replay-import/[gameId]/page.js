import { notFound } from "next/navigation";
import { redirectDevelopmentRoute } from "../../../../../lib/server/developmentRoutes.js";

export default async function LegacyDevelopmentPage({ params, searchParams } = {}) {
  if (process.env.NODE_ENV !== "development") notFound();
  return redirectDevelopmentRoute(`/dev/replay-import/${encodeURIComponent((await params).gameId)}`, searchParams);
}
