import {getBuildableNodes} from "./boardUtils"

export const buildSettlement = (G, color, nodeId, initial_build_phase=false) =>{
    //get all buildable nodes for player color
    const buildable = getBuildableNodes(color, initial_build_phase=initial_build_phase)
    console.log('buildable', buildable)

    return buildable
}