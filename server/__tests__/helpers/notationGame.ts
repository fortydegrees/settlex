// Deterministic synthetic game driver for maintained notation/archive tests.
// Promoted from the locally automated HAN trial; no imported match or account data.
import { InitializeGame, CreateGameReducer } from 'boardgame.io/dist/cjs/internal.js';
import { createCatanGame } from '../../../lib/game-runtime/Game.js';
import { buildableEdges, buildableNodes, canPlaceRobber } from '@settlehex/game-core';
import type { SettleHexNotationSourceArchive as SourceArchive } from '@settlehex/game-core';

type R=Record<string,any>;
const target='0';
const chance=(n:number)=>({2:1,3:2,4:3,5:4,6:5,8:5,9:4,10:3,11:2,12:1} as Record<number,number>)[n]??0;
const resourceValue=(r:string)=>({Wheat:3.2,Ore:3.2,Sheep:2.2,Wood:1.5,Brick:1.5} as Record<string,number>)[r]??0;
const inventory=(resources:string[])=>Object.fromEntries(['Wood','Brick','Sheep','Wheat','Ore'].map(r=>[r,resources.filter(x=>x===r).length]));
const has=(stock:R,cost:R)=>Object.entries(cost).every(([r,n])=>(stock[r]??0)>=Number(n));
const costs={city:{Wheat:2,Ore:3},dev:{Sheep:1,Wheat:1,Ore:1},settlement:{Wood:1,Brick:1,Sheep:1,Wheat:1},road:{Wood:1,Brick:1}};
function nodeScore(state:R,node:number,actor:string):number{
  let score=0;
  for(const item of state.G.tiles){if(item.type!=='Land'||!Object.values(item.tile.nodes??{}).includes(node))continue;score+=chance(item.tile.number)*resourceValue(item.tile.resource)*(item.tile.id===state.G.core.robberTileId?0.65:1);}
  if(actor!==target)return score;
  const owned=Object.keys(state.G.core.buildingsByNodeId).filter(n=>state.G.core.buildingsByNodeId[n].ownerId===actor);
  if(owned.length)score+=Object.entries(inventory(owned.flatMap(n=>state.G.tiles.filter((t:R)=>t.type==='Land'&&Object.values(t.tile.nodes??{}).includes(Number(n))).map((t:R)=>t.tile.resource)))).filter(([,count])=>Number(count)===0).length;
  return score;
}
function chooseSetupNode(state:R,actor:string):number {
  const options=buildableNodes(state.G.core,state.G.coreTopology,actor,{initialPlacement:true});
  if(!options.length)throw new Error(`no legal setup settlement for ${actor}`);
  return [...options].sort((a,b)=>nodeScore(state,b,actor)-nodeScore(state,a,actor)||a-b)[0];
}
function chooseRoad(state:R,actor:string,setupNode?:number):string {
  const options=buildableEdges(state.G.core,state.G.coreTopology,actor,{initialPlacement:setupNode!==undefined,fromNodeId:setupNode});
  if(!options.length)throw new Error(`no legal road for ${actor}`);
  return [...options].sort((a,b)=>{
    const best=(edge:string)=>Math.max(...state.G.coreTopology.edgeNodes[edge].map((node:number)=>nodeScore(state,node,actor)));
    return best(b)-best(a)||a.localeCompare(b);
  })[0];
}
function bestRobberTile(state:R):number {
  const core=state.G.core,actor=state.ctx.currentPlayer;
  const candidates=state.G.tiles.filter((t:R)=>t.type==='Land'&&t.tile.id!==core.robberTileId&&canPlaceRobber(core,state.G.coreTopology,t.tile.id));
  if(!candidates.length)throw new Error('no legal robber destination; source skip has no HAN action');
  // A single victim is handled atomically by the production move. Prefer a
  // productive opponent hex; avoid multi-victim ambiguity.
  const scored=candidates.map((t:R)=>{
    const victims=core.players.filter((p:string)=>p!==actor&&core.playerStateById[p].resources.length>0&&Object.keys(core.buildingsByNodeId).some(n=>core.buildingsByNodeId[n].ownerId===p&&Object.values(t.tile.nodes).includes(Number(n))));
    return {id:t.tile.id,score:(victims.length===1?100:victims.length>1?-100:0)+chance(t.tile.number),victims};
  }).sort((a,b)=>b.score-a.score||a.id-b.id);
  return scored[0].id;
}
function tradingMove(state:R):{give:string[];receive:string[]}|null{
  const core=state.G.core,actor=state.ctx.currentPlayer,stock=inventory(core.playerStateById[actor].resources);
  const targets=[costs.city,costs.dev,costs.settlement];
  const targetCost=targets.find(c=>!has(stock,c)&&Object.keys(c).some(r=>stock[r]<c[r as keyof typeof c]));
  if(!targetCost)return null;
  const missing=Object.keys(targetCost).filter(r=>stock[r]<(targetCost as R)[r]&&core.bank.resources.includes(r));
  if(!missing.length)return null;
  const buildings=Object.entries(core.buildingsByNodeId).filter(([,b])=>(b as R).ownerId===actor).map(([n])=>n);
  const give=Object.keys(stock).map(r=>{
    let ratio=core.ruleset.tradeRates.bank;
    for(const n of buildings){const port=state.G.coreTopology.portsByNodeId[n];if(port===r)ratio=Math.min(ratio,2);else if(port==='Any')ratio=Math.min(ratio,3);}
    return {r,ratio,surplus:stock[r]-(targetCost as R)[r]};
  }).filter(x=>x.surplus>=x.ratio).sort((a,b)=>b.surplus-b.ratio-(a.surplus-a.ratio)||a.r.localeCompare(b.r))[0];
  return give?{give:Array(give.ratio).fill(give.r),receive:[missing[0]]}:null;
}
export interface LocalRun {archive:SourceArchive;moves:number;turns:number;seed:string;}
export function runLocalSettleHexGame({seed='notation-roundtrip-2026-10-19',maxMoves=6000}: {seed?:string;maxMoves?:number}={}):LocalRun{
  const game={...createCatanGame({includeDebugMoves:false,includeEffects:false,includeServerMoves:true}),seed};
  const reducer=CreateGameReducer({game,isClient:false});
  const initialState=InitializeGame({game,numPlayers:3});
  let state:R=initialState;
  const log:R[]=[];
  let paidRoadDone=false;
  function move(name:string,actor:string,args:unknown[]=[]):void{
    if(log.length>=maxMoves)throw new Error(`bounded local game reached ${maxMoves} moves without victory`);
    const action={type:'MAKE_MOVE',payload:{type:name,args,playerID:actor}};
    const before=state;
    const next=reducer(state,action);
    if(next.transients?.error||next._stateID!==before._stateID+1)throw new Error(`legal driver move ${name} for ${actor} failed at ${before._stateID}: ${JSON.stringify(next.transients?.error)}`);
    log.push({_stateID:before._stateID,action});state=next;
  }
  for(const p of ['0','1','2'])move('readyUp',p);
  let turns=0;
  while(!state.ctx.gameover){
    const actor=state.ctx.currentPlayer,core=state.G.core;
    if(state.ctx.phase==='placement'){
      const stage=state.ctx.activePlayers?.[actor];
      if(stage==='settlement')move('placeSettlement',actor,[chooseSetupNode(state,actor)]);
      else if(stage==='road')move('placeRoad',actor,[chooseRoad(state,actor,core.pendingRoadFromNodeIdByPlayer[actor])]);
      else throw new Error(`unexpected setup stage ${stage}`);
      continue;
    }
    const pendingDiscard=Object.keys(state.ctx.activePlayers??{}).find(id=>state.ctx.activePlayers[id]==='robberDiscard');
    if(pendingDiscard){move('discardResources',pendingDiscard,[core.playerStateById[pendingDiscard].resources.slice(0,Math.floor(core.playerStateById[pendingDiscard].resources.length/2))]);continue;}
    const stage=state.ctx.activePlayers?.[actor];
    if(stage==='preRoll'){
      if(actor===target&&core.playerStateById[actor].devCards.includes('knight')&&!core.playerStateById[actor].devCardsBoughtThisTurn.includes('knight')&&core.playerStateById[actor].devCardsPlayedThisTurn===0){move('playDevCardStart',actor,['knight']);continue;}
      if(actor===target&&core.playerStateById[actor].devCards.includes('roadBuilding')&&!core.playerStateById[actor].devCardsBoughtThisTurn.includes('roadBuilding')&&core.playerStateById[actor].devCardsPlayedThisTurn===0&&core.playerStateById[actor].roadsRemaining>=2&&buildableEdges(core,state.G.coreTopology,actor,{initialPlacement:false}).length){move('playDevCardStart',actor,['roadBuilding']);continue;}
      move('rollDice',actor);continue;
    }
    if(stage==='moveRobber'){move('moveRobber',actor,[bestRobberTile(state)]);continue;}
    if(stage==='roadBuilding'){move('placeRoadFromDevCard',actor,[chooseRoad(state,actor)]);continue;}
    if(stage!=='postRoll')throw new Error(`unsupported local runtime stage ${String(stage)} at state ${state._stateID}, phase ${state.ctx.phase}, current ${actor}, active ${JSON.stringify(state.ctx.activePlayers)}, core ${core.turn.phase}`);
    if(actor===target){
      const player=core.playerStateById[actor],stock=inventory(player.resources);
      const settlements=Object.entries(core.buildingsByNodeId).filter(([,b])=>(b as R).ownerId===actor&&(b as R).type==='settlement').map(([n])=>Number(n));
      if(has(stock,costs.city)&&settlements.length){move('placeCity',actor,[settlements.sort((a,b)=>nodeScore(state,b,actor)-nodeScore(state,a,actor))[0]]);continue;}
      const legalNodes=buildableNodes(core,state.G.coreTopology,actor,{initialPlacement:false});
      if(has(stock,costs.settlement)&&legalNodes.length){move('placeSettlement',actor,[[...legalNodes].sort((a,b)=>nodeScore(state,b,actor)-nodeScore(state,a,actor))[0]]);continue;}
      const legalEdges=buildableEdges(core,state.G.coreTopology,actor,{initialPlacement:false});
      if(!paidRoadDone&&has(stock,costs.road)&&legalEdges.length&&player.roadsRemaining>0){move('placeRoad',actor,[chooseRoad(state,actor)]);paidRoadDone=true;continue;}
      if(has(stock,costs.dev)&&core.devDeck.length){move('buyDevCard',actor);continue;}
      if(has(stock,costs.road)&&legalEdges.length&&player.roadsRemaining>0&&player.settlementsRemaining>0){move('placeRoad',actor,[chooseRoad(state,actor)]);continue;}
      const trade=tradingMove(state);if(trade){move('maritimeTrade',actor,[trade]);continue;}
    }
    move('endTurn',actor);turns++;
  }
  return {archive:{initialState,log,finalState:state},moves:log.length,turns,seed};
}
