import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, symlink, writeFile, utimes } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalReplayGetHandler } from "../api/dev/local-replays/handler.js";
import { localReplayPayload } from "./fixtures/localReplayPayload.js";
const dirs=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(dir=>rm(dir,{recursive:true,force:true})));});
const request=(query="",headers={})=>new Request(`http://localhost:3011/api/dev/local-replays${query}`,{headers});
async function setup() {
  const directory=await mkdtemp(join(tmpdir(),"local-replays-"));dirs.push(directory);
  const payload=localReplayPayload();
  await writeFile(join(directory,"game.replay.json"),JSON.stringify(payload));
  return {directory,payload,get:createLocalReplayGetHandler({directory,mode:"development"})};
}
describe("development local replay directory",()=>{
  it("lists saved games and reads the selected generic replay without a database",async()=>{
    const {get,payload}=await setup();
    const list=await (await get(request())).json();
    expect(list).toMatchObject({total:1,games:[{id:"game.replay.json",players:["Human","MultiCast"],checkpoint:"test checkpoint",isComplete:false,eventCount:3}]});
    expect(await (await get(request("?file=game.replay.json"))).json()).toEqual(payload);
  });
  it("excludes raw recordings, malformed files and links; never reads outside the directory",async()=>{
    const {directory,get}=await setup();
    await writeFile(join(directory,"raw.jsonl"),"private recording");
    await writeFile(join(directory,"bad.replay.json"),"broken");
    await symlink(join(directory,"game.replay.json"),join(directory,"link.replay.json"));
    expect(await (await get(request())).json()).toMatchObject({total:1,skipped:1});
    for(const name of ["../game.replay.json","/tmp/game.replay.json","link.replay.json","raw.jsonl"]){expect((await get(request(`?file=${encodeURIComponent(name)}`))).status).toBeGreaterThanOrEqual(400);}
    expect((await get(request("?file=bad.replay.json"))).status).toBe(400);
  });
  it("is unavailable in production and rejects remote/cross-origin requests",async()=>{
    const {directory,get}=await setup();
    expect((await createLocalReplayGetHandler({directory,mode:"production"})(request())).status).toBe(404);
    expect((await get(new Request("https://settlehex.com/api/dev/local-replays"))).status).toBe(403);
    expect((await get(request("",{origin:"https://example.com"}))).status).toBe(403);
    expect((await get(request("",{"sec-fetch-site":"cross-site"}))).status).toBe(403);
  });
  it("gives setup instructions when no local directory is configured",async()=>{
    const response=await createLocalReplayGetHandler({directory:"",mode:"development"})(request());
    expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:expect.stringContaining("SETTLEHEX_LOCAL_REPLAY_DIR")});
  });
  it("lists compact notation and serves the original record without expanded frames",async()=>{
    const {directory,get}=await setup();
    const record=JSON.parse(readFileSync('docs/notation/examples/settlehex-complete.han.json','utf8'));
    await writeFile(join(directory,'compact.han.json'),JSON.stringify(record));
    const list=await (await get(request())).json();
    expect(list.games.find(g=>g.id==='compact.han.json')).toMatchObject({isComplete:true,eventCount:2542});
    const response=await (await get(request('?file=compact.han.json'))).json();
    expect(response).toEqual(record);
    expect(response.frames).toBeUndefined();
  });

  it("filters across the whole library before pagination and opens a unique ID",async()=>{
    const {directory,get,payload}=await setup();
    for(let index=0;index<24;index++) {
      const path=join(directory,`capture-${index}.replay.json`);
      await writeFile(path,JSON.stringify(payload));
      await utimes(path,1000+index,1000+index);
    }
    const first=await (await get(request())).json();
    expect(first).toMatchObject({total:25,nextOffset:20});
    expect(first.games).toHaveLength(20);
    const second=await (await get(request('?offset=20'))).json();
    expect(second).toMatchObject({total:25,nextOffset:null});
    expect(second.games).toHaveLength(5);
    expect(new Set([...first.games,...second.games].map(game=>game.id)).size).toBe(25);
    const filtered=await (await get(request('?q=capture-2'))).json();
    expect(filtered.total).toBe(5);
    expect(filtered.games.map(game=>game.id)).toEqual(['capture-23.replay.json','capture-22.replay.json','capture-21.replay.json','capture-20.replay.json','capture-2.replay.json']);
    expect(await (await get(request('?game=capture-23'))).json()).toEqual(payload);
    expect((await get(request('?game=capture-'))).status).toBe(409);
    expect((await get(request('?game=missing'))).status).toBe(404);
    expect((await get(request('?game=../capture-23'))).status).toBe(400);
  });
  it("lists recording summaries without conversion and converts only the selected file",async()=>{
    const {directory,payload}=await setup();
    await writeFile(join(directory,'capture-123.jsonl'),'header\nbody\n');
    const adapter={
      summarize:({head})=>{expect(head).toContain('header');return {players:['Human','Bot'],isComplete:true,eventCount:42};},
      convert:(text)=>{expect(text).toBe('header\nbody\n');return payload;},
    };
    const get=createLocalReplayGetHandler({directory,mode:'development',recordingAdapter:adapter});
    expect(await (await get(request('?q=capture-123'))).json()).toMatchObject({total:1,games:[{id:'capture-123.jsonl',players:['Human','Bot'],eventCount:42}]});
    expect(await (await get(request('?game=capture-123'))).json()).toEqual(payload);
    await symlink(join(directory,'capture-123.jsonl'),join(directory,'link.jsonl'));
    expect((await get(request('?file=link.jsonl'))).status).toBe(400);
  });

});
