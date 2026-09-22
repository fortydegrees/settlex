import { createElement as h } from "react";
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
        "settlex-ui-inset p-4",
    },
    h(
      "p",
      {
        className:
          "settlex-ui-label min-h-[2.5rem] sm:min-h-0",
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
        "settlex-ui-inset flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
    },
    h(
      "div",
      {
        className: "min-w-0 space-y-1",
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
          "settlex-ui-button settlex-ui-button-primary settlex-ui-focus min-h-[2.75rem] shrink-0 px-4 py-2 text-sm",
        href: `/g/${encodeURIComponent(match.bgioMatchId)}`,
      },
      "Watch replay"
    )
  );

export function PublicProfileView({ profile }) {
  const { account, summary, recentMatches } = profile;

  return h(
    "main",
    {
      className: "min-h-screen px-4 py-10 text-slate-800",
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
            "settlex-ui-pane p-5 sm:p-6",
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
              className: "flex min-w-0 items-center gap-4",
            },
            h(
              "div",
              {
                className:
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl ring-1 ring-white/70",
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
                className: "min-w-0 space-y-1",
              },
              h(
                "p",
                {
                  className:
                    "settlex-ui-label",
                },
                "Public profile"
              ),
              h(
                "h1",
                {
                  className: "break-words text-2xl font-semibold text-slate-900 sm:text-[1.75rem]",
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
                "text-sm font-medium text-slate-600",
            },
            `${summary.wins} win${summary.wins === 1 ? "" : "s"} from ${
              summary.totalGames
            } game${summary.totalGames === 1 ? "" : "s"}`
          )
        )
      ),
      h(
        "section",
        {
          className: "settlex-ui-pane grid grid-cols-3 gap-2 p-3 sm:gap-4 sm:p-4",
        },
        statCards(summary).map(renderStatCard)
      ),
      h(
        "section",
        {
          className:
            "settlex-ui-pane p-5 sm:p-6",
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
                  "settlex-ui-label",
              },
              "Recent matches"
            ),
            h(
              "h2",
              {
                className: "settlex-ui-heading mt-1",
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
                  "settlex-ui-inset mt-6 p-4 text-sm text-slate-600",
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
}
