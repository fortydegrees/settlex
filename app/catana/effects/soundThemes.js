export const DEFAULT_THEME = {
  "resource:pop:start": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.6 },
  "resource:travel:start": { src: "/sounds/card_woosh.mp3", volume: 0.6 },
  "build:settlement": { src: "/sounds/settle.mp3", volume: 0.6 },
  "build:city": { src: "/sounds/settle.mp3", volume: 0.6 },
  "build:road": { src: "/sounds/road.mp3", volume: 0.6 },
  "build:place": { src: "/sounds/settle_place.mp3", volume: 0.6 },
  "dice:roll": {
    variants: [
      "/sounds/dice_roll1.mp3",
      "/sounds/dice_roll2.mp3",
      "/sounds/dice_roll3.mp3",
      "/sounds/dice_roll4.mp3",
      "/sounds/dice_roll5.mp3"
    ],
    volume: 0.5,
    allowWhenHidden: true,
    shuffle: true,
    randomize: { volume: [0.9, 1.0], rate: [0.98, 1.02] }
  },
  "turn:start": { src: "/sounds/turn-start.mp3", volume: 0.6, allowWhenHidden: true }
};
