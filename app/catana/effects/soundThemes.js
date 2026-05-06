export const DEFAULT_THEME = {
  "resource:pop:start": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.4 },
  "resource:travel:start": { src: "/sounds/card_woosh.mp3", volume: 0.4 },
  "build:settlement": { src: "/sounds/settle.mp3", volume: 0.6 },
  "build:city": { src: "/sounds/settle.mp3", volume: 0.6 },
  "build:road": { src: "/sounds/road.mp3", volume: 0.6 },
  "build:place": { src: "/sounds/build_settlement.mp3", volume: 0.8 },
  "devcard:buy:public": { src: "/sounds/card_woosh.mp3", volume: 0.34 },
  "devcard:knight:play": { src: "/sounds/card_woosh.mp3", volume: 0.42 },
  "devcard:knight:flip": { src: "/sounds/card_woosh.mp3", volume: 0.36 },
  "devcard:knight:resolve": { src: "/sounds/card_woosh.mp3", volume: 0.38 },
  "devcard:roadBuilding:play": { src: "/sounds/card_woosh.mp3", volume: 0.42 },
  "devcard:roadBuilding:flip": { src: "/sounds/card_woosh.mp3", volume: 0.36 },
  "devcard:roadBuilding:resolve": { src: "/sounds/card_woosh.mp3", volume: 0.34 },
  "devcard:yearOfPlenty:play": { src: "/sounds/card_woosh.mp3", volume: 0.42 },
  "devcard:yearOfPlenty:flip": { src: "/sounds/card_woosh.mp3", volume: 0.36 },
  "devcard:yearOfPlenty:resolve": { src: "/sounds/card_woosh.mp3", volume: 0.34 },
  "devcard:monopoly:play": { src: "/sounds/card_woosh.mp3", volume: 0.42 },
  "devcard:monopoly:flip": { src: "/sounds/card_woosh.mp3", volume: 0.36 },
  "devcard:monopoly:resolve": { src: "/sounds/card_woosh.mp3", volume: 0.34 },
  "dice:roll": {
    // Dice visuals use these clip lengths to sync the shake and settle phases.
    leadIn: {
      variants: [
        "/sounds/dice-roll-test/dice_roll1.mp3",
        "/sounds/dice-roll-test/dice_roll2.mp3",
        "/sounds/dice-roll-test/dice_roll3.mp3",
        "/sounds/dice-roll-test/dice_roll4.mp3"
      ],
      durationMsBySrc: {
        "/sounds/dice-roll-test/dice_roll1.mp3": 424,
        "/sounds/dice-roll-test/dice_roll2.mp3": 567,
        "/sounds/dice-roll-test/dice_roll3.mp3": 458,
        "/sounds/dice-roll-test/dice_roll4.mp3": 498
      },
      volume: 0.32,
      timelineLeadMs: 120,
      shuffle: true
    },
    variants: [
      "/sounds/die-throw-1.mp3",
      "/sounds/die-throw-2.mp3",
      "/sounds/die-throw-3.mp3",
      "/sounds/die-throw-4.mp3"
    ],
    durationMsBySrc: {
      "/sounds/die-throw-1.mp3": 418,
      "/sounds/die-throw-2.mp3": 461,
      "/sounds/die-throw-3.mp3": 591,
      "/sounds/die-throw-4.mp3": 391
    },
    layers: 2,
    volume: 0.32,
    startDelayPortion: 0,
    impactLeadPortion: 0,
    layerDelayMs: [0, 20],
    allowWhenHidden: true,
    shuffle: true,
    randomize: { volume: [0.9, 1.0], rate: [0.95, 1.05] }
  },
  "turn:start": { src: "/sounds/turn-start.mp3", volume: 0.6, allowWhenHidden: true },
  "game:win": { src: "/sounds/turn-start.mp3", volume: 0.7 },
  "game:lose": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.5 }
};
