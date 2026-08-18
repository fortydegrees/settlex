import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..", "..");
const metadataPath = path.join(repoRoot, "app", "metadata.js");
const imageAssetsPath = path.join(repoRoot, "app", "opengraph-assets.js");
const imagePath = path.join(repoRoot, "app", "opengraph-image.jsx");

const loadMetadata = async () => {
  try {
    return await import(`${pathToFileURL(metadataPath).href}?t=${Date.now()}`);
  } catch (error) {
    return { loadError: error };
  }
};

const loadImage = async () => {
  try {
    return await import(`${pathToFileURL(imagePath).href}?t=${Date.now()}`);
  } catch (error) {
    return { loadError: error };
  }
};

const loadImageAssets = async () => {
  try {
    return await import(
      `${pathToFileURL(imageAssetsPath).href}?t=${Date.now()}`
    );
  } catch (error) {
    return { loadError: error };
  }
};

describe("SettleHex metadata", () => {
  it("describes the beta promise and configures a large social share card", async () => {
    const metadata = await loadMetadata();
    const expectedTitle =
      "SettleHex — Free Online Catan for Quick 1v1 Games";
    const expectedDescription =
      "Free online Catan for quick 1v1 games. Balanced boards. Play a friend, find a match, or challenge Puffer.";

    expect(metadata.loadError).toBeUndefined();
    expect(metadata.BRAND_NAME).toBe("SettleHex");
    expect(metadata.BETA_PRIMARY_DESCRIPTOR).toBe(
      "Free online Catan for quick 1v1 games."
    );
    expect(metadata.BETA_SUPPORTING_PROOF).toBe(
      "Balanced boards. Play a friend, find a match, or challenge Puffer."
    );
    expect(metadata.BRAND_DOMAIN_LABEL).toBe("SETTLEHEX.COM");
    expect(metadata.SHARE_IMAGE_ALT).toBe(
      "SettleHex — Free online Catan for quick 1v1 games."
    );
    expect(metadata.SITE_METADATA).toMatchObject({
      metadataBase: new URL("https://settlehex.com"),
      title: {
        default: expectedTitle,
        template: "%s · SettleHex",
      },
      description: expectedDescription,
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        siteName: "SettleHex",
        title: expectedTitle,
        description: expectedDescription,
        url: "/",
        images: [
          expect.objectContaining({
            url: "/opengraph-image",
            width: 1200,
            height: 630,
          }),
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: expectedTitle,
        description: expectedDescription,
        images: [expect.objectContaining({ url: "/opengraph-image" })],
      },
    });
  });

  it("creates privacy-safe metadata for a shared match URL", async () => {
    const metadata = await loadMetadata();
    const matchMetadata = metadata.createMatchMetadata("m/1?friend=true");

    expect(metadata.loadError).toBeUndefined();
    expect(matchMetadata).toMatchObject({
      title: expect.stringMatching(/SettleHex.*game/i),
      description: expect.stringMatching(/join a live .*game/i),
      alternates: {
        canonical: "/g/m%2F1%3Ffriend%3Dtrue",
      },
      openGraph: {
        type: "website",
        url: "/g/m%2F1%3Ffriend%3Dtrue",
        // Dimensions must survive here: setting `images` overrides Next's
        // opengraph-image file convention, which is what supplies them.
        images: [
          expect.objectContaining({
            url: "/opengraph-image",
            width: 1200,
            height: 630,
          }),
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [expect.objectContaining({ url: "/opengraph-image" })],
      },
      robots: {
        index: false,
        follow: false,
      },
    });
  });

  it("allows share previews while excluding private and development surfaces", async () => {
    const metadata = await loadMetadata();
    const robots = metadata.createRobotsMetadata();

    expect(metadata.loadError).toBeUndefined();
    expect(robots).toEqual({
      rules: {
        userAgent: "*",
        allow: ["/", "/g/", "/u/"],
        disallow: ["/api/", "/account", "/board-editor", "/catana/dev/"],
      },
      sitemap: "https://settlehex.com/sitemap.xml",
    });
  });

  it("publishes only the public homepage in the initial sitemap", async () => {
    const metadata = await loadMetadata();

    expect(metadata.loadError).toBeUndefined();
    expect(metadata.createSitemapEntries()).toEqual([
      { url: "https://settlehex.com/" },
    ]);
  });

  it("exposes a deterministic PNG share-image route contract", async () => {
    const image = await loadImage();

    expect(image.loadError).toBeUndefined();
    expect(image.alt).toContain("SettleHex");
    expect(image.size).toEqual({ width: 1200, height: 630 });
    expect(image.contentType).toBe("image/png");
    expect(image.default).toBeTypeOf("function");

    const response = image.default();
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("uses shipped Catana SVGs and the Outfit brand font", async () => {
    const assets = await loadImageAssets();

    expect(assets.loadError).toBeUndefined();
    expect(assets.SHARE_CARD_FONT_PATH).toBe("/fonts/Outfit-Medium.ttf");
    expect(assets.SHARE_CARD_BOLD_FONT_PATH).toBe("/fonts/Outfit-Bold.ttf");
    expect(assets.SHARE_CARD_BLACK_FONT_PATH).toBe("/fonts/Outfit-Black.ttf");

    // Tiles and resource icons are keyed by the same resource names the board uses.
    expect(Object.keys(assets.SHARE_CARD_ASSETS.tiles)).toEqual(
      expect.arrayContaining(["Wood", "Brick", "Sheep", "Wheat", "Ore", "Desert"])
    );
    expect(Object.keys(assets.SHARE_CARD_ASSETS.icons)).toEqual(
      Object.keys(assets.SHARE_CARD_ASSETS.tiles)
    );
    expect(Object.keys(assets.SHARE_CARD_ASSETS.pieces)).toEqual(
      expect.arrayContaining(["settlement", "city", "road"])
    );
    // A shared card shows a two-seat match, drawn in canonical seat colours.
    expect(assets.SHARE_CARD_SEAT_COLOR_IDS).toHaveLength(2);
    for (const byColor of Object.values(assets.SHARE_CARD_ASSETS.pieces)) {
      expect(Object.keys(byColor)).toEqual([...assets.SHARE_CARD_SEAT_COLOR_IDS]);
    }

    const svgPaths = assets.listShareCardSvgPaths();
    expect(svgPaths.length).toBeGreaterThanOrEqual(19);

    for (const publicPath of svgPaths) {
      expect(
        fs.existsSync(path.join(repoRoot, "public", publicPath.slice(1)))
      ).toBe(true);
      expect(assets.readShareCardAsset(publicPath)).toMatch(
        /^data:image\/svg\+xml;base64,/
      );
    }

    expect(assets.readShareCardFont().byteLength).toBeGreaterThan(1000);
    expect(
      assets.readShareCardFont(assets.SHARE_CARD_BOLD_FONT_PATH).byteLength
    ).toBeGreaterThan(1000);
    expect(
      assets.readShareCardFont(assets.SHARE_CARD_BLACK_FONT_PATH).byteLength
    ).toBeGreaterThan(1000);
  });
});
