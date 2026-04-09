import { Buffer } from "node:buffer";
import { cookies } from "next/headers";
import { shouldUseSecureCookies } from "./cookieNames.js";

export const MATCH_CREDENTIAL_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MATCH_CREDENTIAL_COOKIE_PREFIX = "settlehex_match_cred_";

const encodeCookieToken = (value) =>
  Buffer.from(String(value ?? ""), "utf8").toString("base64url");

const serializeCookie = ({ name, value, maxAge, secure }) => {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export const getMatchCredentialCookieName = ({ matchID, playerID }) =>
  `${MATCH_CREDENTIAL_COOKIE_PREFIX}${encodeCookieToken(matchID)}_${encodeCookieToken(playerID)}`;

export const writeMatchCredentialCookie = (
  response,
  { matchID, playerID, credentials } = {}
) => {
  if (!response || !matchID || playerID == null || !credentials) {
    return response;
  }

  response.headers.append(
    "Set-Cookie",
    serializeCookie({
      name: getMatchCredentialCookieName({ matchID, playerID }),
      value: credentials,
      maxAge: MATCH_CREDENTIAL_MAX_AGE_SECONDS,
      secure: shouldUseSecureCookies(),
    })
  );

  return response;
};

export const clearMatchCredentialCookie = (
  response,
  { matchID, playerID } = {}
) => {
  if (!response || !matchID || playerID == null) {
    return response;
  }

  response.headers.append(
    "Set-Cookie",
    serializeCookie({
      name: getMatchCredentialCookieName({ matchID, playerID }),
      value: "",
      maxAge: 0,
      secure: shouldUseSecureCookies(),
    })
  );

  return response;
};

export const readMatchCredentialCookie = ({
  matchID,
  playerID,
  cookieStore = cookies(),
} = {}) => {
  if (!matchID || playerID == null) {
    return null;
  }

  return (
    cookieStore
      ?.get?.(getMatchCredentialCookieName({ matchID, playerID }))
      ?.value ?? null
  );
};
