import environment from "../../../../lib/config/environment.cjs";
const { readEnvironment } = environment;
import { replayHAN } from "@settlehex/game-core";
import { constants } from "node:fs";
import { open, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { parseLocalReplayFile } from "../../../_features/replay/localReplayFile.js";

const validName = (name) => name.length <= 255 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:replay|han|cgn)\.json$/.test(name);
const json = (body, status=200) => Response.json(body, {status,headers:{"Cache-Control":"no-store"}});
const validRecording = (name) => name.length <= 255 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.jsonl$/.test(name);
async function loadRecordingAdapter(path) {
  if (!path) return null;
  return import(/* webpackIgnore: true */ pathToFileURL(resolve(path)).href);
}
async function sample(file, size, position) {
  const buffer = Buffer.alloc(size);
  const {bytesRead} = await file.read(buffer,0,size,position);
  return buffer.subarray(0,bytesRead).toString("utf8");
}
async function readReplay(root, name, adapter, summaryOnly = false) {
  // O_NOFOLLOW also protects a selection if a listed file is replaced by a link.
  const file = await open(join(root,name),constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error("Expected a regular replay file");
    if (validRecording(name)) {
      if (!adapter) throw new Error("Recording adapter is not configured");
      if (!summaryOnly) return {payload:parseLocalReplayFile(JSON.stringify(await adapter.convert(await file.readFile("utf8"))))};
      const head = await sample(file,Math.min(stat.size,65536),0);
      const tail = stat.size <= 65536 ? head : await sample(file,Math.min(stat.size,65536),Math.max(0,stat.size-65536));
      const summary = await adapter.summarize({head,tail,fileName:name});
      if (!summary) throw new Error("Recording has no playable state yet");
      return {modifiedAt:stat.mtime.toISOString(),summary};
    }
    const text = await file.readFile("utf8");
    const raw = JSON.parse(text);
    if (raw?.format === "han-prototype") {
      const states = replayHAN(raw);
      return {payload:raw,modifiedAt:stat.mtime.toISOString(),summary:{
        players:raw.players.map(id=>`Player ${id}`),checkpoint:null,
        isComplete:raw.coverage === "complete",eventCount:states.length,verificationMode:null,
      }};
    }
    return {payload:parseLocalReplayFile(text),modifiedAt:stat.mtime.toISOString()};
  } finally { await file.close(); }
}

export const createLocalReplayGetHandler = ({
  directory=readEnvironment(process.env, "SETTLEHEX_LOCAL_REPLAY_DIR"),
  mode=process.env.NODE_ENV,
  recordingAdapter,
  adapterPath=readEnvironment(process.env, "SETTLEHEX_LOCAL_REPLAY_ADAPTER"),
}={}) => async (request) => {
  if (mode !== "development") return json({error:"Not found"},404);
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!["localhost","127.0.0.1","[::1]"].includes(url.hostname)
    || (origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({error:"Local access required"},403);
  if (!directory) return json({error:"Set SETTLEHEX_LOCAL_REPLAY_DIR to your saved replay directory, then restart the local development server."},503);
  const root = resolve(directory);
  let adapter;
  try { adapter = recordingAdapter ?? await loadRecordingAdapter(adapterPath); }
  catch { return json({error:"Local recording adapter could not be loaded. Check SETTLEHEX_LOCAL_REPLAY_ADAPTER."},503); }
  const supported = (name) => validName(name) || (adapter && validRecording(name));
  const name = url.searchParams.get("file");
  const game = url.searchParams.get("game");
  const readSelected = async (selected) => {
    try { return json((await readReplay(root,selected,adapter)).payload); }
    catch (error) { return json({error:error.code === "ENOENT" ? "Replay file no longer exists. Refresh the game list." : "Replay file could not be read or converted. The capture may be incomplete or unsupported."},error.code === "ENOENT" ? 404 : 400); }
  };
  if (name !== null) {
    if (!supported(name)) return json({error:"Invalid replay filename"},400);
    return readSelected(name);
  }
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0) return json({error:"Invalid page offset"},400);
  if (game !== null && (game.length > 255 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(game))) return json({error:"Invalid game ID"},400);
  let entries;
  try { entries = (await readdir(root,{withFileTypes:true})).filter(entry=>entry.isFile() && supported(entry.name)); }
  catch { return json({error:"Replay directory is unavailable. Check SETTLEHEX_LOCAL_REPLAY_DIR and restart or refresh."},503); }
  // Prefer the compact source when an older expanded copy is also present.
  if (adapter) {
    const names = new Set(entries.map(entry=>entry.name));
    entries = entries.filter(entry=>!entry.name.endsWith(".replay.json") || !names.has(entry.name.replace(/\.replay\.json$/,".jsonl")));
  }
  if (game !== null) {
    const exact = entries.find(entry=>entry.name === game || entry.name.replace(/\.(?:jsonl|(?:replay|han|cgn)\.json)$/,'') === game);
    const matches = exact ? [exact] : entries.filter(entry=>entry.name.toLowerCase().includes(game.toLowerCase()));
    if (!matches.length) return json({error:"No recording matches this game ID."},404);
    if (matches.length > 1) return json({error:"Multiple recordings match. Use a longer ID or choose one from the library."},409);
    return readSelected(matches[0].name);
  }
  const games=[];let skipped=0;
  for (const entry of entries) {
    if (!entry.isFile() || !supported(entry.name)) continue;
    try {
      const {payload,modifiedAt,summary}=await readReplay(root,entry.name,adapter,true);
      if (summary) { games.push({id:entry.name,modifiedAt,...summary}); continue; }
      games.push({id:entry.name,modifiedAt,players:payload.replay.participants.map(player=>player.usernameSnapshot),checkpoint:payload.replay.metadata?.checkpoint?.label ?? null,
        isComplete:payload.replay.isComplete,eventCount:payload.frames.length,verificationMode:payload.replay.metadata?.verificationMode ?? null});
    } catch { skipped+=1; }
  }
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const filtered = games.filter(game=>[game.id,game.gameId,game.roomCode,...game.players].some(value=>value?.toLowerCase().includes(query)));
  filtered.sort((a,b)=>(b.recordedAt ?? b.modifiedAt).localeCompare(a.recordedAt ?? a.modifiedAt) || a.id.localeCompare(b.id));
  return json({games:filtered.slice(offset,offset+20),total:filtered.length,offset,nextOffset:offset+20<filtered.length ? offset+20 : null,skipped});
};

export const GET = (request) => createLocalReplayGetHandler()(request);
