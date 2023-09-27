import { useBoardContext } from '../hooks/useBoardContext';

export function filterNodesWithBuilding(nodes) {
    return nodes.filter(node => node.building !== null);
  }
  

//export const getBuildableNodes = (color, initial_build_phase=initial_build_phase) =>{
export const getBuildableNodes = (color) =>{
    const { isActive, ctx, playerID, G } = useBoardContext();
    console.log("BOARDCONTEXT", G)
    return G
    // if (initial_build_phase){
    //     return G
    // }

}