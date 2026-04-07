import {
  GUEST_SESSION_COOKIE_NAME,
  GUEST_SESSION_MAX_AGE_SECONDS,
  shouldUseSecureCookies,
} from "./cookieNames.js";

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

export const writeSessionCookie = (response, session) => {
  const cookieValue = session?.cookieValue ?? [session?.selector, session?.token].filter(Boolean).join(".");
  if (!cookieValue) {
    return response;
  }

  response.headers.append(
    "Set-Cookie",
    serializeCookie({
      name: GUEST_SESSION_COOKIE_NAME,
      value: cookieValue,
      maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
      secure: shouldUseSecureCookies(),
    })
  );

  return response;
};
