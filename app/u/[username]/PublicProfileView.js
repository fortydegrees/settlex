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
        "settlex-ui-inset p-ui-4",
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
        className: "mt-ui-2 type-page text-ink-primary",
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
        "settlex-ui-inset flex flex-col gap-ui-3 p-ui-4 sm:flex-row sm:items-center sm:justify-between",
    },
    h(
      "div",
      {
        className: "min-w-0 space-y-ui-1",
      },
      h(
        "p",
        {
          className: "break-words type-action-small text-ink-primary",
        },
        `${match.gameName} · ${match.playerCount} players`
      ),
      h(
        "p",
        {
          className: "type-body-small text-ink-secondary",
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
          "settlex-ui-button settlex-ui-button-primary settlex-ui-focus min-h-[2.75rem] shrink-0 px-ui-4 py-ui-2 type-action-small",
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
      className: "min-h-screen px-ui-4 py-ui-10 text-ink-primary",
      style: { background: CATANA_TABLE_BACKGROUND },
    },
    h(
      "div",
      {
        className: "mx-auto flex max-w-5xl flex-col gap-ui-6",
      },
      h(
        "section",
        {
          className:
            "settlex-ui-pane p-ui-5 sm:p-ui-6",
        },
        h(
          "div",
          {
            className:
              "flex flex-col gap-ui-4 sm:flex-row sm:items-end sm:justify-between",
          },
          h(
            "div",
            {
              className: "flex min-w-0 items-center gap-ui-4",
            },
            h(
              "div",
              {
                className:
                  "settlex-ui-avatar-profile flex h-16 w-16 shrink-0 items-center justify-center rounded-pill",
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
                className: "min-w-0 space-y-ui-1",
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
                  className: "break-words type-title text-ink-primary",
                },
                account.currentUsername
              ),
              h(
                "p",
                {
                  className: "type-label text-ink-secondary",
                },
                `Joined ${formatDate(account.createdAt)}`
              )
            )
          ),
          h(
            "p",
            {
              className:
                "type-label text-ink-secondary",
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
          className: "settlex-ui-pane grid grid-cols-3 gap-ui-2 p-ui-3 sm:gap-ui-4 sm:p-ui-4",
        },
        statCards(summary).map(renderStatCard)
      ),
      h(
        "section",
        {
          className:
            "settlex-ui-pane p-ui-5 sm:p-ui-6",
        },
        h(
          "div",
          {
            className: "flex items-center justify-between gap-ui-4",
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
                className: "settlex-ui-heading mt-ui-1",
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
                  "settlex-ui-inset mt-ui-6 p-ui-4 type-body-small text-ink-secondary",
              },
              "No finished games yet."
            )
          : h(
              "div",
              {
                className: "mt-ui-6 space-y-ui-3",
              },
              recentMatches.map(renderRecentMatch)
            )
      )
    )
  );
}
