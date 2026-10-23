import { redirectDevelopmentRoute } from "../../../../lib/server/developmentRoutes.js";

export default function LegacyDevelopmentPage({ searchParams } = {}) {
  return redirectDevelopmentRoute("/dev/ui", searchParams);
}
