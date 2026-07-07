import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../lib/server/auth/betterAuth.js";

export const { POST, GET } = toNextJsHandler(auth);

export const dynamic = "force-dynamic";
