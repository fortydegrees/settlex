// src/server.js
const { Server, Origins } = require('boardgame.io/server');
const { Catan } = require('../app/catana/Game');

const server = Server({
  games: [Catan],
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT],
});

const lobbyConfig = {
  apiPort: 8080,
  apiCallback: () => console.log('Running Lobby API on port 8080...'),
};

server.run({ port: 8000, lobbyConfig });

