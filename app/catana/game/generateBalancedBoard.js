//import {spec} from './spec'

//https://github.com/cgagliardi/settlers-setup/blob/master/src/app/board/strategy/strategy.ts
const OPTIONS = {
    desertPlacement: 'Random', //Random, Center, Off Center, Inland, Coast
    resourceDistribution: 1,
    numberDistribution: 1,
    shufflePorts: true,
    allowResourceOnPort: true,
}

export const generateBalancedBoard = (spec) =>{
    //calculate target score of board
    const targetScore = calculateTargetScore(spec)

    const desertPlacement = chooseDesertPlacement(spec)
}

/**
 * These values allow us to generate boards with a specific numberDistribution.
 * Any time the algorithm is modified or new boards are added, this should be updated
 * with new values. To generate this list, call calculateStrategyScores() from
 * the browser console.
 */
const SCORE_RANGES = {
    'standard4p': { greedy: 13.014067729766802, fair: 5.893507115912209 },
    // [BoardShape.EXPANSION6]: { greedy: 15.854644082031252, fair: 5.459049609374999 },
    // [BoardShape.SEAFARERS1]: { greedy: 22.19497916666667, fair: 7.765675357938958 },
    // [BoardShape.SEAFARERS2]: { greedy: 16.912793885030865, fair: 11.232163108710564 },
    // [BoardShape.DRAGONS]: { greedy: 22.21849821428571, fair: 11.630966830357144 },
  };

const chooseDesertPlacement = spec => {
    if (OPTIONS.desertPlacement === "Random" &&
        spec.name === "standard4p") {
      const rand = Math.random();
      if (rand < 0.2) {
        return 'Center';
      } else if (rand < 0.6) {
        return 'Coast';
      } else {
        return 'Off Center';
      }
    } else {
      return OPTIONS.desertPlacement;
    }
  }

const calculateTargetScore = (spec) => {
    switch (OPTIONS.numberDistribution) {
      case 1:
        return Number.MAX_VALUE;
      case 0:
        return 0;
      default:
        const range = SCORE_RANGES[spec.name];
        if (!range) {
          console.error(`score range missing for "${spec.name}"`);
          return 0.5;
        }
        return (1 - OPTIONS.numberDistribution) *
            (range.greedy - range.fair) + range.fair;
    }
  }
