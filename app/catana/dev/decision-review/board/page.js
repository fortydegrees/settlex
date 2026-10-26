import { redirectDevelopmentRoute } from "../../../../../lib/server/developmentRoutes.js";

export default async function LegacyDevelopmentPage({ searchParams } = {}) {
  return redirectDevelopmentRoute("/dev/decision-review/board", searchParams);
}
