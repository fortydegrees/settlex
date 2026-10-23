import { redirectDevelopmentRoute } from "../../lib/server/developmentRoutes.js";

export default function DevelopmentIndex({ searchParams } = {}) {
  return redirectDevelopmentRoute("/dev/sandbox", searchParams);
}
