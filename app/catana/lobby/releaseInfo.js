import releaseNotesData from "../../../release/release-notes.json";

const toTrimmedString = (value) =>
  typeof value === "string" ? value.trim() : "";

const toVersion = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeHighlights = (highlights) =>
  Array.isArray(highlights)
    ? highlights
        .map((highlight) => toTrimmedString(highlight))
        .filter(Boolean)
    : [];

export function buildPublicReleaseInfo({
  releaseNotes = releaseNotesData,
  env = process.env
} = {}) {
  const envVersion = toVersion(env.NEXT_PUBLIC_SETTLEX_RELEASE_VERSION);
  const currentVersion = envVersion ?? releaseNotes.currentVersion;
  const currentRelease =
    releaseNotes.releases?.find((release) => release.version === currentVersion) ??
    releaseNotes.releases?.[0] ??
    {};
  const version = currentRelease.version ?? currentVersion;
  const releaseLabel =
    toTrimmedString(currentRelease.label) || `release ${version}`;
  const buildSha = toTrimmedString(env.NEXT_PUBLIC_SETTLEX_BUILD_SHA);
  const buildDate = toTrimmedString(env.NEXT_PUBLIC_SETTLEX_BUILD_DATE);

  return {
    version,
    releaseLabel,
    title: toTrimmedString(currentRelease.title) || "Settlex update",
    date: toTrimmedString(currentRelease.date),
    highlights: normalizeHighlights(currentRelease.highlights),
    buildSha,
    buildShaShort: buildSha ? buildSha.slice(0, 7) : "local",
    buildDate
  };
}

export const publicReleaseInfo = buildPublicReleaseInfo();
