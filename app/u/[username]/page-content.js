import { createElement as h } from "react";
import { notFound } from "next/navigation";
import { getPublicProfile } from "../../../lib/server/profiles/getPublicProfile.js";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

const statCards = (summary) => [
  {
    label: "Total games",
    value: summary.totalGames,
  },
  {
    label: "Wins",
    value: summary.wins,
  },
  {
    label: "Losses",
    value: summary.losses,
  },
];

const renderStatCard = (stat) =>
  h(
    "article",
    {
      key: stat.label,
      className:
        "rounded-2xl bg-white/35 p-4 shadow-lg ring-1 ring-white/40 backdrop-blur-sm",
    },
    h(
      "p",
      {
        className:
          "text-xs font-semibold uppercase tracking-[0.18em] text-slate-600",
      },
      stat.label
    ),
    h(
      "p",
      {
        className: "mt-2 text-3xl font-bold text-slate-900",
      },
      stat.value
    )
  );

const renderRecentMatch = (match) =>
  h(
    "article",
    {
      key: match.archivedMatchId,
      className:
        "flex flex-col gap-3 rounded-2xl bg-white/65 p-4 shadow-lg ring-1 ring-white/60 sm:flex-row sm:items-center sm:justify-between",
    },
    h(
      "div",
      {
        className: "space-y-1",
      },
      h(
        "p",
        {
          className: "text-sm font-semibold text-slate-900",
        },
        `${match.gameName} · ${match.playerCount} players`
      ),
      h(
        "p",
        {
          className: "text-sm text-slate-600",
        },
        `${
          match.result === "win"
            ? "Won"
            : match.result === "loss"
            ? "Lost"
            : "Finished"
        } on ${formatDate(match.finishedAt)}`
      )
    ),
    h(
      "a",
      {
        className:
          "inline-flex items-center justify-center rounded-full bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-lime-600",
        href: `/replays/${match.replayId}`,
      },
      "Watch replay"
    )
  );

export const createProfilePage = ({
  getPublicProfile: getPublicProfileImpl = getPublicProfile,
  notFoundImpl = notFound,
} = {}) =>
  async function PublicProfilePage({ params }) {
    const profile = await getPublicProfileImpl(params?.username);

    if (!profile) {
      return notFoundImpl();
    }

    const { account, summary, recentMatches } = profile;

    return h(
      "main",
      {
        className:
          "min-h-screen px-4 py-10 text-slate-800",
        style: { background: CATANA_TABLE_BACKGROUND },
      },
      h(
        "div",
        {
          className: "mx-auto flex max-w-5xl flex-col gap-6",
        },
        h(
          "section",
          {
            className:
              "rounded-3xl bg-blue-200/95 p-6 shadow-xl ring-2 ring-white/60 backdrop-blur-sm",
          },
          h(
            "div",
            {
              className:
                "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
            },
            h(
              "div",
              {
                className: "flex items-center gap-4",
              },
              h(
                "div",
                {
                  className:
                    "flex h-20 w-20 items-center justify-center rounded-3xl bg-white/70 text-4xl shadow-lg ring-1 ring-white/70",
                  style: { backgroundColor: account.avatarColor },
                },
                h(
                  "span",
                  {
                    "aria-hidden": "true",
                  },
                  account.avatarEmoji
                )
              ),
              h(
                "div",
                {
                  className: "space-y-1",
                },
                h(
                  "p",
                  {
                    className:
                      "text-xs font-semibold uppercase tracking-[0.24em] text-slate-600",
                  },
                  "Public profile"
                ),
                h(
                  "h1",
                  {
                    className: "text-4xl font-bold text-slate-900",
                  },
                  account.currentUsername
                ),
                h(
                  "p",
                  {
                    className: "text-sm font-medium text-slate-600",
                  },
                  `Joined ${formatDate(account.createdAt)}`
                )
              )
            ),
            h(
              "p",
              {
                className:
                  "rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/70",
              },
              `${summary.wins} win${summary.wins === 1 ? "" : "s"} from ${summary.totalGames} game${summary.totalGames === 1 ? "" : "s"}`
            )
          )
        ),
        h(
          "section",
          {
            className: "grid gap-4 sm:grid-cols-3",
          },
          statCards(summary).map(renderStatCard)
        ),
        h(
          "section",
          {
            className:
              "rounded-3xl bg-white/35 p-6 shadow-xl ring-1 ring-white/40 backdrop-blur-sm",
          },
          h(
            "div",
            {
              className: "flex items-center justify-between gap-4",
            },
            h(
              "div",
              null,
              h(
                "p",
                {
                  className:
                    "text-xs font-semibold uppercase tracking-[0.24em] text-slate-600",
                },
                "Recent matches"
              ),
              h(
                "h2",
                {
                  className: "mt-1 text-2xl font-bold text-slate-900",
                },
                "Finished games"
              )
            )
          ),
          recentMatches.length === 0
            ? h(
                "p",
                {
                  className:
                    "mt-6 rounded-2xl bg-white/55 p-4 text-sm text-slate-600 shadow-sm ring-1 ring-white/60",
                },
                "No finished games yet."
              )
            : h(
                "div",
                {
                  className: "mt-6 space-y-3",
                },
                recentMatches.map(renderRecentMatch)
              )
        )
      )
    );
  };

const PublicProfilePage = createProfilePage();

export default PublicProfilePage;
