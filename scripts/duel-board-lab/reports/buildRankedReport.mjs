import { createReadStream } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { escapeHtml, renderBoardSvg } from "./renderBoard.mjs";
import {
  addRecordToSummary,
  createEmptySummary,
  finaliseSummary
} from "./summary.mjs";

async function* readJsonLines(path) {
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) yield JSON.parse(line);
  }
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const formatScore = (value) => Number.isFinite(value) ? value.toFixed(2) : "n/a";

function formatLine(line) {
  return line?.map(({ player, nodeId }) => `${player} ${nodeId}`).join(" → ") ?? "None";
}

function mergeSelectedBoards(boards) {
  const byCandidateIndex = new Map();
  for (const board of boards) {
    const candidateIndex = board.record.candidateIndex;
    const existing = byCandidateIndex.get(candidateIndex);
    if (!existing) {
      byCandidateIndex.set(candidateIndex, {
        ...board,
        selectionReasons: [...new Set(
          board.selectionReasons ?? board.selectionGroups ?? []
        )].sort()
      });
      continue;
    }
    existing.selectionReasons = [...new Set([
      ...existing.selectionReasons,
      ...(board.selectionReasons ?? board.selectionGroups ?? [])
    ])].sort();
    existing.diagnosticV3 ??= board.diagnosticV3;
  }
  return [...byCandidateIndex.values()];
}

function countSelectionReasons(boards) {
  const counts = {};
  for (const board of boards) {
    for (const reason of board.selectionReasons) {
      counts[reason] = (counts[reason] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function componentRows(diagnosticV3) {
  const p1 = diagnosticV3.selectedPortfolios.P1.components;
  const p2 = diagnosticV3.selectedPortfolios.P2.components;
  return Object.keys(p1).map((name) => (
    `<tr><th scope="row">${escapeHtml(name)}</th>`
      + `<td>${escapeHtml(formatScore(p1[name]))}</td>`
      + `<td>${escapeHtml(formatScore(p2[name]))}</td></tr>`
  )).join("");
}

function renderCard(board, rank) {
  const { record, diagnosticV3, tiles } = board;
  const tags = record.tags.length > 0
    ? record.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")
    : '<span class="tag quiet">no warnings</span>';
  const reasons = board.selectionReasons.map(escapeHtml).join(" · ") || "None";
  const selectedLine = formatLine(diagnosticV3.selectedLine);
  const diagnostics = diagnosticV3.choiceDiagnostics;
  return `<article class="board-card" data-candidate-index="${escapeHtml(record.candidateIndex)}"`
    + ` data-overall="${escapeHtml(record.overallScore)}"`
    + ` data-fairness="${escapeHtml(record.scores.fairness)}"`
    + ` data-quality="${escapeHtml(record.scores.quality)}"`
    + ` data-interest="${escapeHtml(record.scores.interest)}">`
    + '<header class="card-header">'
    + `<div><span class="rank" aria-label="Rank ${escapeHtml(rank)}">#${escapeHtml(rank)}</span>`
    + `<h2>Seed ${escapeHtml(record.seed)}</h2>`
    + `<p>${escapeHtml(record.generatorFamily)}</p></div>`
    + `<strong class="overall"><span>Overall</span>${escapeHtml(formatScore(record.overallScore))}</strong>`
    + "</header>"
    + '<dl class="score-strip">'
    + `<div><dt>Fairness</dt><dd>${escapeHtml(formatScore(record.scores.fairness))}</dd></div>`
    + `<div><dt>Quality</dt><dd>${escapeHtml(formatScore(record.scores.quality))}</dd></div>`
    + `<div><dt>Interest</dt><dd>${escapeHtml(formatScore(record.scores.interest))}</dd></div>`
    + "</dl>"
    + `<div class="tags">${tags}</div>`
    + renderBoardSvg({ tiles, record, diagnosticV3 })
    + '<details><summary>Opening diagnostics</summary><div class="diagnostics">'
    + `<p><b>Chosen line</b><br>${escapeHtml(selectedLine)}</p>`
    + `<p><b>Normalized seat advantage</b><br>${escapeHtml(formatScore(diagnosticV3.components.normalizedAdvantage))}</p>`
    + `<p><b>Candidate pool</b><br>${escapeHtml(diagnostics.candidatePoolSize)} nodes · ${escapeHtml(diagnostics.evaluatedSequenceCount)} legal lines</p>`
    + `<p><b>Choice depth / response freedom</b><br>${escapeHtml(formatScore(diagnostics.choiceDepth))} / ${escapeHtml(formatScore(diagnostics.responseFreedom))}</p>`
    + `<p><b>Selected because</b><br>${reasons}</p>`
    + '<table><caption>Selected portfolio components</caption><thead><tr><th>Component</th><th>P1</th><th>P2</th></tr></thead>'
    + `<tbody>${componentRows(diagnosticV3)}</tbody></table>`
    + "</div></details></article>";
}

function renderSummary(summary) {
  const speed = summary.run?.throughput?.boardsPerSecond;
  return '<section class="run-summary" aria-label="Run summary">'
    + `<span><b>${escapeHtml(summary.count)}</b> candidates</span>`
    + `<span><b>${escapeHtml(summary.statuses.ranked)}</b> ranked</span>`
    + `<span><b>${escapeHtml(summary.statuses.invalid)}</b> invalid</span>`
    + `<span>overall median <b>${escapeHtml(formatScore(summary.scores.overall.median))}</b></span>`
    + (Number.isFinite(speed)
      ? `<span>run throughput <b>${escapeHtml(formatScore(speed))}</b> boards/s</span>`
      : "")
    + "</section>";
}

function renderDocument(summary, boards) {
  const cards = boards.map((board, index) => renderCard(board, index + 1)).join("");
  return "<!doctype html>"
    + '<html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>Duel fair v3 ranked boards</title><style>'
    + ':root{font-family:Outfit,ui-rounded,system-ui,sans-serif;color:#1e293b;background:#bfdbfe;color-scheme:light}'
    + '*{box-sizing:border-box}body{max-width:1500px;margin:0 auto;padding:28px 24px 48px;background:radial-gradient(circle at top,#e0f2fe 0,#bfdbfe 55%,#93c5fd 100%);min-height:100vh}'
    + 'h1,h2,p{margin:0}h1{font-size:clamp(1.8rem,4vw,3rem);line-height:1;letter-spacing:-.04em}.lede{margin-top:10px;color:#475569;max-width:64ch}'
    + '.run-summary{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:18px;color:#475569;font-size:.82rem}.run-summary b{color:#1e293b}'
    + '.controls{position:sticky;top:12px;z-index:10;display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:24px 0;padding:12px 14px;border:1px solid #fff9;border-radius:16px;background:#ffffffc9;box-shadow:0 14px 36px #1e3a8a18;backdrop-filter:blur(12px)}'
    + '.control{display:grid;gap:4px;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.control select{min-width:130px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:8px 10px;color:#1e293b;font:700 .82rem/1 system-ui}.check{display:flex;align-items:center;gap:8px;padding:8px 2px;font-size:.8rem;font-weight:700;color:#334155;text-transform:none;letter-spacing:0}'
    + '.board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,430px),1fr));gap:18px}.board-card{overflow:hidden;padding:16px;border:1px solid #fff;border-radius:20px;background:#ffffffe0;box-shadow:0 18px 44px #1e3a8a1c;backdrop-filter:blur(8px)}'
    + '.card-header{display:flex;justify-content:space-between;gap:14px;align-items:start}.card-header>div{display:grid;grid-template-columns:auto 1fr;column-gap:9px;align-items:center}.card-header h2{font-size:1.2rem}.card-header p{grid-column:2;color:#64748b;font-size:.72rem}.rank{grid-row:1/3;padding:6px 8px;border-radius:9px;background:#fbbf24;color:#334155;font-size:.75rem;font-weight:900}.overall{display:grid;text-align:right;font-size:1.45rem;line-height:1}.overall span{font-size:.58rem;text-transform:uppercase;letter-spacing:.12em;color:#64748b}'
    + '.score-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.score-strip div{padding:8px;border-radius:10px;background:#eff6ff;text-align:center}.score-strip dt{font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.score-strip dd{margin:2px 0 0;font-size:.95rem;font-weight:850}'
    + '.tags{display:flex;min-height:24px;flex-wrap:wrap;gap:5px}.tag{padding:4px 7px;border-radius:999px;background:#dbeafe;color:#334155;font-size:.64rem;font-weight:750}.tag.quiet{color:#64748b;background:#f1f5f9}.board-card svg{display:block;width:100%;height:auto;margin-top:8px;border-radius:14px}'
    + '.placement-overlay{display:none}body.show-placements .placement-overlay{display:inline}'
    + 'details{margin-top:10px;border-top:1px solid #dbeafe;padding-top:10px}summary{cursor:pointer;color:#475569;font-size:.76rem;font-weight:800}.diagnostics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.diagnostics p{font-size:.72rem;color:#475569}.diagnostics b{color:#334155}.diagnostics table{grid-column:1/-1;width:100%;border-collapse:collapse;font-size:.7rem}.diagnostics caption{text-align:left;padding:5px 0;font-weight:800;color:#475569}.diagnostics th,.diagnostics td{padding:5px;border-top:1px solid #e2e8f0;text-align:right}.diagnostics th:first-child{text-align:left}'
    + '@media(max-width:600px){body{padding:18px 12px 36px}.controls{top:6px}.board-card{padding:12px}.diagnostics{grid-template-columns:1fr}}'
    + '</style></head><body><header><h1>Duel fair v3</h1><p class="lede">One ranked gallery. Fairness leads the default score; quality breaks ties in favour of boards both players can actually use.</p>'
    + renderSummary(summary)
    + '</header><form class="controls" aria-label="Gallery controls"><label class="control">Sort score<select id="sort-score"><option value="overall">Overall</option><option value="fairness">Fairness</option><option value="quality">Quality</option><option value="interest">Interest</option></select></label>'
    + '<label class="control">Direction<select id="sort-direction"><option value="desc">High to low</option><option value="asc">Low to high</option></select></label>'
    + '<label class="check"><input id="show-placements" type="checkbox"> Show suggested placements</label></form>'
    + `<main id="board-grid" class="board-grid">${cards}</main>`
    + '<script>(()=>{const grid=document.getElementById("board-grid");const score=document.getElementById("sort-score");const direction=document.getElementById("sort-direction");const placements=document.getElementById("show-placements");function sort(){const key=score.value;const sign=direction.value==="asc"?1:-1;const cards=[...grid.querySelectorAll(".board-card")];cards.sort((a,b)=>sign*(Number(a.dataset[key])-Number(b.dataset[key]))||Number(a.dataset.candidateIndex)-Number(b.dataset.candidateIndex));cards.forEach((card,index)=>{card.querySelector(".rank").textContent=`#${index+1}`;grid.append(card)})}score.addEventListener("change",sort);direction.addEventListener("change",sort);placements.addEventListener("change",()=>{document.body.classList.toggle("show-placements",placements.checked);document.querySelectorAll(".placement-overlay").forEach(node=>node.setAttribute("aria-hidden",String(!placements.checked)))})})();</script>'
    + "</body></html>";
}

export async function buildRankedReport(runDir) {
  const summary = createEmptySummary();
  for await (const record of readJsonLines(join(runDir, "candidates.jsonl"))) {
    addRecordToSummary(summary, record);
  }
  finaliseSummary(summary);
  const boardFiles = (await readdir(join(runDir, "boards")))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const selectedBoards = await Promise.all(boardFiles.map(async (name) => (
    JSON.parse(await readFile(join(runDir, "boards", name), "utf8"))
  )));
  const mergedBoards = mergeSelectedBoards(selectedBoards);
  const manifest = await readJsonIfPresent(join(runDir, "manifest.json"));
  summary.selectionReasons = countSelectionReasons(mergedBoards);
  summary.run = manifest?.status === "complete" && manifest.summary
    ? {
      peakRssMiB: manifest.summary.peakRssMiB,
      throughput: manifest.summary.throughput
    }
    : null;
  await writeFile(join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  const boards = mergedBoards
    .filter((board) => board.record.status === "ranked" && board.diagnosticV3)
    .sort((left, right) =>
      right.record.overallScore - left.record.overallScore
        || left.record.candidateIndex - right.record.candidateIndex);
  const reportPath = join(runDir, "report.html");
  await writeFile(reportPath, renderDocument(summary, boards));
  return { reportPath, summary };
}
