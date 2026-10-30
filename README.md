# SettleHex

1v1 Catan with balanced boards. I spent far too long on this.

| Folder | What's inside |
| --- | --- |
| `app/` | Frontend: website, game board and UI, plus website API routes. |
| `game-core/` | Rules engine, game state and game notation in TypeScript. |
| `lib/` | Game setup and boardgame.io integration, accounts, database access and shared helpers. |
| `server/` | Live multiplayer server, timers, bots and game archives. |
| `public/` | Images, sounds, fonts and other browser assets. |
| `native/` | Rust worker for the SettleGraph bot. |
| `infra/` | Docker Compose, reverse proxy and deployment scripts. |
| `scripts/` | Database migrations, tests, board generation and maintenance commands. |
| `patches/` | Small fixes applied to third-party dependencies during installation. |
| `docs/` | Setup, architecture and development guides. |

[Run locally](docs/getting-started.md) · [Documentation](docs/README.md)
