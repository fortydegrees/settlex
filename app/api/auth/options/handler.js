import { NextResponse } from "next/server";
import {
  EMAIL_PASSWORD_AUTH_ENABLED,
  getSocialProviders,
} from "../../../../lib/server/auth/betterAuth.js";

const getConfiguredSocialProviderIds = (providers) =>
  Object.keys(providers ?? {}).sort();

export const createAuthOptionsRoute =
  ({
    emailPassword = EMAIL_PASSWORD_AUTH_ENABLED,
    getSocialProviders: getSocialProvidersImpl = getSocialProviders,
  } = {}) =>
  async () =>
    NextResponse.json({
      emailPassword: Boolean(emailPassword),
      socialProviders: getConfiguredSocialProviderIds(getSocialProvidersImpl()),
    });

export const GET = createAuthOptionsRoute();
