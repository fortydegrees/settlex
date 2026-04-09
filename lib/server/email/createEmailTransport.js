const createTransportError = () =>
  Object.assign(new Error("Magic link delivery is not configured for production yet"), {
    status: 501,
  });

export const createEmailTransport = ({
  environment = process.env.NODE_ENV ?? "development",
  log = console.log,
} = {}) => ({
  async sendMagicLink({ email, magicLinkUrl }) {
    if (environment === "production") {
      throw createTransportError();
    }

    log(`[settlehex magic link] ${email} -> ${magicLinkUrl}`);

    return {
      previewUrl: magicLinkUrl,
    };
  },
});
