export const DEFAULT_HAPTIC_THEME = {
  "ui:tap": { pattern: 8, minIntervalMs: 60 },
  "ui:action:press": { pattern: 10, minIntervalMs: 70 },
  "ui:roll:press": { pattern: 10, minIntervalMs: 120 },
  "ui:end-turn:hold:start": { pattern: 8, minIntervalMs: 200 },
  "ui:end-turn:hold:confirm": { pattern: [8, 28, 16], minIntervalMs: 300 },
  "ui:tray:toggle": { pattern: 8, minIntervalMs: 90 },

  "dice:roll": {
    pattern: [8, 30, 16],
    planDelay: "firstLayer",
    minIntervalMs: 500
  },
  "turn:start": { pattern: [10, 46, 14], minIntervalMs: 900 },
  "build:road": { pattern: 10, minIntervalMs: 120 },
  "build:settlement": { pattern: 16, minIntervalMs: 140 },
  "build:city": { pattern: [12, 28, 20], minIntervalMs: 180 },

  "devcard:knight:play": { pattern: 10, minIntervalMs: 160 },
  "devcard:knight:resolve": { pattern: [10, 30, 18], minIntervalMs: 200 },
  "devcard:roadBuilding:play": { pattern: 10, minIntervalMs: 160 },
  "devcard:roadBuilding:resolve": { pattern: [8, 28, 12], minIntervalMs: 200 },
  "devcard:yearOfPlenty:play": { pattern: 10, minIntervalMs: 160 },
  "devcard:yearOfPlenty:resolve": { pattern: [8, 28, 14], minIntervalMs: 200 },
  "devcard:monopoly:play": { pattern: 10, minIntervalMs: 160 },
  "devcard:monopoly:resolve": { pattern: [12, 32, 20], minIntervalMs: 240 },

  "robber:move": { pattern: [10, 34, 18], minIntervalMs: 280 },
  "award:longest-road": { pattern: [10, 34, 16, 34, 22], minIntervalMs: 600 },
  "award:largest-army": { pattern: [10, 34, 16, 34, 22], minIntervalMs: 600 },
  "game:win": { pattern: [12, 42, 18, 42, 28], minIntervalMs: 1200 },
  "game:lose": { pattern: 10, minIntervalMs: 1200 }
};
