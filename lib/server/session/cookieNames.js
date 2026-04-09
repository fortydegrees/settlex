import { GUEST_SESSION_TTL_MS } from "../accounts/createGuestAccount.js";

const GUEST_SESSION_COOKIE_NAME = "settlehex_session";
const GUEST_SESSION_MAX_AGE_SECONDS = Math.floor(GUEST_SESSION_TTL_MS / 1000);

const shouldUseSecureCookies = () =>
  process.env.PUBLIC_APP_URL?.startsWith("https://") ?? false;

export {
  GUEST_SESSION_COOKIE_NAME,
  GUEST_SESSION_MAX_AGE_SECONDS,
  shouldUseSecureCookies,
};
