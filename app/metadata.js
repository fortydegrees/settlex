export const SITE_URL = "https://settlehex.com";
export const SHARE_IMAGE_PATH = "/opengraph-image";

export const BRAND_NAME = "SettleHex";
export const BETA_PRIMARY_DESCRIPTOR =
  "Free online Catan for quick 1v1 games.";
export const BETA_SUPPORTING_PROOF =
  "Balanced boards. Play a friend, find a match, or challenge Puffer.";
export const BRAND_DOMAIN_LABEL = "SETTLEHEX.COM";
export const SHARE_IMAGE_ALT = `${BRAND_NAME} — ${BETA_PRIMARY_DESCRIPTOR}`;

// Declared explicitly on every share surface. A route that sets `images`
// overrides Next's `opengraph-image` file convention, so without the width and
// height here a shared /g/:matchID link loses the large-card hints that Discord
// and LinkedIn use before they fetch the PNG.
const SHARE_IMAGE = {
  url: SHARE_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: SHARE_IMAGE_ALT,
};

const SHARE_TWITTER_IMAGE = {
  url: SHARE_IMAGE_PATH,
  alt: SHARE_IMAGE_ALT,
};

export const ROOT_TITLE =
  `${BRAND_NAME} — Free Online Catan for Quick 1v1 Games`;
export const ROOT_DESCRIPTION =
  `${BETA_PRIMARY_DESCRIPTOR} ${BETA_SUPPORTING_PROOF}`;

export const SITE_METADATA = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: ROOT_TITLE,
    template: `%s · ${BRAND_NAME}`,
  },
  description: ROOT_DESCRIPTION,
  applicationName: BRAND_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    url: "/",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: ROOT_TITLE,
    description: ROOT_DESCRIPTION,
    images: [SHARE_TWITTER_IMAGE],
  },
};

export const createMatchMetadata = (matchID) => {
  const encodedMatchID = encodeURIComponent(String(matchID ?? ""));
  const matchPath = `/g/${encodedMatchID}`;
  const title = "Join a SettleHex game";
  const description =
    "Open this link to join a live SettleHex game or watch the replay.";

  return {
    title,
    description,
    alternates: {
      canonical: matchPath,
    },
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      title,
      description,
      url: matchPath,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SHARE_TWITTER_IMAGE],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
};

export const createRobotsMetadata = () => ({
  rules: {
    userAgent: "*",
    allow: ["/", "/g/", "/u/"],
    disallow: ["/api/", "/account", "/board-editor", "/catana/dev/"],
  },
  sitemap: `${SITE_URL}/sitemap.xml`,
});

export const createSitemapEntries = () => [{ url: `${SITE_URL}/` }];
