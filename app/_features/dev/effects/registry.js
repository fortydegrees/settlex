import { ResourceDistributionLab } from "./ResourceDistributionLab.jsx";
import { PiecePlacementLab } from "./PiecePlacementLab.jsx";
import { DevCardRevealLab } from "./DevCardRevealLab.jsx";

export const EFFECTS_LAB_REGISTRY = [
  {
    id: "piece-placement",
    label: "Piece Placement",
    component: PiecePlacementLab,
    supportsAudio: true,
    cues: ["build:settlement", "build:road", "build:city"]
  },
  {
    id: "resource-distribution",
    label: "Resource Distribution",
    component: ResourceDistributionLab,
    supportsAudio: true,
    cues: ["resource:pop:start", "resource:travel:start"]
  },
  {
    id: "dev-card-reveal",
    label: "Dev Card Reveal",
    component: DevCardRevealLab,
    supportsAudio: false,
    cues: []
  }
];
