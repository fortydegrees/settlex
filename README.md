# SettleHex

1v1 Catan with balanced boards. I spent far too long on this.

To play locally:

```sh
git clone https://github.com/fortydegrees/settlex.git
cd settlex
docker compose up --build
```

Then open [localhost:3000](http://localhost:3000). Use a second browser or a private
window for the other player. The first build takes a few minutes; bot play is
disabled in this setup.

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
| `docs/` | Setup, architecture and development guides (AI Generated, for now). |
