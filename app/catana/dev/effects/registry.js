import { ResourceDistributionLab } from "./ResourceDistributionLab.jsx";
import { PiecePlacementLab } from "./PiecePlacementLab.jsx";

export const EFFECTS_LAB_REGISTRY = [
  {
    id: "piece-placement",
    label: "Piece Placement",
    component: PiecePlacementLab,
    supportsAudio: true
  },
  {
    id: "resource-distribution",
    label: "Resource Distribution",
    component: ResourceDistributionLab,
    supportsAudio: true
  }
];
