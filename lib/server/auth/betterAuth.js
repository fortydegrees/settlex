import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins/anonymous";
import { getPool } from "../db/getPool.js";
import { generateGuestUsername } from "../accounts/generateGuestUsername.js";
import { transferAccountProfile } from "../accounts/transferAccountProfile.js";

const DEVELOPMENT_AUTH_SECRET =
  "development-only-settlehex-better-auth-secret-change-before-production";
const BUILD_TIME_AUTH_SECRET =
  "build-time-only-settlehex-better-auth-secret";
export const EMAIL_PASSWORD_AUTH_ENABLED = true;

export const allowsBuildTimeServerPlaceholders = () =>
  process.env.SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS === "1";

export const getAuthSecret = () => {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) return secret;

  if (allowsBuildTimeServerPlaceholders()) {
    return BUILD_TIME_AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }

  return DEVELOPMENT_AUTH_SECRET;
};

const getAuthBaseUrl = () => {
  const configured =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();

  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";
};

const providerConfig = ({ clientId, clientSecret }) => {
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
  };
};

export const getSocialProviders = () => {
  const google = providerConfig({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });
  const discord = providerConfig({
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  });

  return {
    ...(google ? { google } : {}),
    ...(discord ? { discord } : {}),
  };
};

export const auth = betterAuth({
  appName: "Settlehex",
  baseURL: getAuthBaseUrl(),
  secret: getAuthSecret(),
  database: getPool(),
  emailAndPassword: {
    enabled: EMAIL_PASSWORD_AUTH_ENABLED,
  },
  user: {
    modelName: "auth_users",
  },
  session: {
    modelName: "auth_sessions",
  },
  account: {
    modelName: "auth_accounts",
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "discord"],
    },
  },
  verification: {
    modelName: "auth_verifications",
  },
  socialProviders: getSocialProviders(),
  plugins: [
    anonymous({
      emailDomainName: "settlehex.local",
      generateName: () => generateGuestUsername(),
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await transferAccountProfile({
          fromAccountId: anonymousUser.user.id,
          toAccountId: newUser.user.id,
        });
      },
    }),
  ],
});
