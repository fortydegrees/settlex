import { describe, expect, it } from "vitest";
import { parseLocalReplayFile, createLocalReplayReader } from "../_features/replay/localReplayFile.js";
import { buildReplayTimeline } from "../_features/replay/replayTimeline.js";
import { createReplaySessionState, replaySessionReducer } from "../_features/replay/replaySessionState.js";
import { localReplayPayload as payload } from "./fixtures/localReplayPayload.js";
describe("generic local replay file",()=>{
  it("loads frames without needing an account, database or finished game",()=>{
    const result=parseLocalReplayFile(JSON.stringify(payload()));
    expect(result.frames).toHaveLength(3);
    expect(result.replay.initialPerspectivePlayerID).toBe("2");
    expect(result.frames[1].annotation.decision.label).toBe("Build settlement");
  });
  it("rejects wrong formats, malformed states and ambiguous frame/player identity",()=>{
    expect(()=>parseLocalReplayFile("not json")).toThrow(/JSON/i);
    for(const mutate of [p=>p.schemaVersion=99,p=>p.frames[1].index=0,p=>delete p.frames[0].state.G.core,p=>p.replay.participants[1].seatId="1",p=>p.replay.initialPerspectivePlayerID="99",p=>p.frames[1].annotation.decision.playerId="99",p=>p.frames[2].state.G.core.players=["9"]]) {
      const p=payload();mutate(p);expect(()=>parseLocalReplayFile(JSON.stringify(p))).toThrow();
    }
  });
  it("rejects broken render geometry, card identities and display metadata before mounting",()=>{
    for (const mutate of [p=>p.frames[0].state.G.tiles=[],p=>p.frames[0].state.G.tiles[0].coordinate=[0,0],p=>p.frames[0].state.G.tiles[0].tile.nodes=null,p=>p.frames[0].state.G.core.playerStateById["1"].resources=["Desert"],p=>p.replay.metadata.checkpoint.label={},p=>p.frames[0].state.G.core.ruleset.victoryPointsToWin=null,p=>p.replay.isComplete=true]) {
      const p=payload();mutate(p);expect(()=>parseLocalReplayFile(JSON.stringify(p))).toThrow(/replay/i);
    }
  });
  it("rejects malformed pieces, unknown owners and pieces outside the board",()=>{
    for (const mutate of [p=>p.frames[0].state.G.core.buildingsByNodeId={"0":null},p=>p.frames[0].state.G.core.buildingsByNodeId={"0":{ownerId:"99",type:"settlement"}},p=>p.frames[0].state.G.core.buildingsByNodeId={"0":{ownerId:"1",type:"castle"}},p=>p.frames[0].state.G.core.buildingsByNodeId={"999":{ownerId:"1",type:"city"}},p=>p.frames[0].state.G.core.roadsByEdgeId={"0,1":null},p=>p.frames[0].state.G.core.roadsByEdgeId={"0,1":"99"},p=>p.frames[0].state.G.core.roadsByEdgeId={"1,99":"1"}]) {
      const p=payload();mutate(p);expect(()=>parseLocalReplayFile(JSON.stringify(p))).toThrow(/piece/i);
    }
    const valid=payload();valid.frames[0].state.G.core.buildingsByNodeId={"0":{ownerId:"1",type:"settlement"}};valid.frames[0].state.G.core.roadsByEdgeId={"0,1":"1"};
    expect(parseLocalReplayFile(JSON.stringify(valid)).frames).toHaveLength(3);
  });
  it("cancels a pending selection without showing its later result",async()=>{
    const loaded=[];let resolve;
    const reader=createLocalReplayReader({onReady:p=>loaded.push(p),onError:()=>{}});
    const pending=reader.read(()=>new Promise(done=>{resolve=done;}));
    reader.cancel();resolve(JSON.stringify(payload()));await pending;
    expect(loaded).toEqual([]);
  });
  it("keeps snapshot and decision events, turn navigation and annotations together",()=>{
    const p=payload();const timeline=buildReplayTimeline({frames:p.frames,participants:p.replay.participants});
    expect(timeline.events.map(e=>e.label)).toEqual(["Captured position","Decision: build","Next turn"]);
    expect(timeline.events[1].annotation.decision.playerId).toBe("2");
    expect(timeline.events[2].annotation.notes).toEqual(["History gap"]);
    expect(timeline.turnStarts).toEqual([{turn:1,eventIndex:0},{turn:2,eventIndex:2}]);
  });
  it("does not open results on the last position of an incomplete capture",()=>{
    const initial=createReplaySessionState({eventCount:3,isComplete:false});
    expect(replaySessionReducer(initial,{type:"seek",eventIndex:2})).toMatchObject({eventIndex:2,resultsOpen:false});
    expect(replaySessionReducer(initial,{type:"openResults"}).resultsOpen).toBe(false);
    const complete=createReplaySessionState({eventCount:3});
    expect(replaySessionReducer(complete,{type:"seek",eventIndex:2}).resultsOpen).toBe(true);
  });
  it("ignores stale file reads when a newer selection finishes first",async()=>{
    const loaded=[];const errors=[];let resolveFirst;
    const reader=createLocalReplayReader({onReady:p=>loaded.push(p),onError:e=>errors.push(e)});
    const first=reader.read(()=>new Promise(resolve=>{resolveFirst=resolve;}));
    const next=payload();next.replay.match.replayId="new-file";
    await reader.read(async()=>JSON.stringify(next));
    resolveFirst(JSON.stringify(payload()));await first;
    expect(loaded.map(p=>p.replay.match.replayId)).toEqual(["new-file"]);expect(errors).toEqual([]);
    reader.cancel();await reader.read(async()=>"bad");expect(errors).toHaveLength(1);
  });
});
