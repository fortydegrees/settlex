use std::io::{self, BufRead, Write};
use std::path::PathBuf;

use serde_json::{json, Value};
use settlegraph_v2::decision::DecisionEngine;
use settlegraph_v2::load_verified_model;
use settlegraph_v2::protocol::WorkerRequest;
use settlegraph_v2::snapshot::import_snapshot;

fn parse_model_path() -> Result<PathBuf, String> {
    let mut args = std::env::args().skip(1);
    let mut model = None;
    while let Some(argument) = args.next() {
        match argument.as_str() {
            "--model" => {
                let value = args
                    .next()
                    .ok_or_else(|| "--model requires a path".to_owned())?;
                model = Some(PathBuf::from(value));
            }
            other => return Err(format!("unknown worker argument {other:?}")),
        }
    }
    model.ok_or_else(|| "settlegraph-v2-worker requires --model <path>".to_owned())
}

fn write_response(stdout: &mut impl Write, response: &Value) -> Result<(), String> {
    serde_json::to_writer(&mut *stdout, response)
        .map_err(|error| format!("cannot serialize worker response: {error}"))?;
    stdout
        .write_all(b"\n")
        .map_err(|error| format!("cannot write worker response: {error}"))?;
    stdout
        .flush()
        .map_err(|error| format!("cannot flush worker response: {error}"))
}

fn request_id(value: &Value) -> Value {
    value.get("id").cloned().unwrap_or(Value::Null)
}

fn run() -> Result<(), String> {
    let model_path = parse_model_path()?;
    let model = load_verified_model(&model_path)?;
    let mut engine = DecisionEngine::new(model);
    eprintln!(
        "[settlegraph-v2] ready model={} contract={}",
        engine.model_sha256, engine.contract.contract_sha256
    );

    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line.map_err(|error| format!("cannot read worker request: {error}"))?;
        if line.trim().is_empty() {
            continue;
        }
        let value: Value = match serde_json::from_str(&line) {
            Ok(value) => value,
            Err(error) => {
                write_response(
                    &mut stdout,
                    &json!({ "id": null, "ok": false, "error": format!("invalid request JSON: {error}") }),
                )?;
                continue;
            }
        };
        let id = request_id(&value);
        let request: WorkerRequest = match serde_json::from_value(value) {
            Ok(request) => request,
            Err(error) => {
                write_response(
                    &mut stdout,
                    &json!({ "id": id, "ok": false, "error": format!("invalid worker request: {error}") }),
                )?;
                continue;
            }
        };

        let response = match request.mode.as_str() {
            "health" => json!({
                "id": request.id,
                "ok": true,
                "modelSha256": engine.model_sha256,
                "contract": engine.contract
            }),
            "decide" => {
                let result = (|| {
                    let player_id = request
                        .player_id
                        .as_deref()
                        .ok_or_else(|| "decide request requires playerId".to_owned())?;
                    let state = request
                        .state
                        .as_ref()
                        .ok_or_else(|| "decide request requires state".to_owned())?;
                    let state_id = state.state_id;
                    let imported = import_snapshot(state, player_id)?;
                    let decision = engine.decide(imported)?;
                    Ok::<_, String>((state_id, decision))
                })();
                match result {
                    Ok((state_id, decision)) => json!({
                        "id": request.id,
                        "ok": true,
                        "stateId": state_id,
                        "plannedMoves": decision.planned_moves,
                        "actionIds": decision.action_ids,
                        "value": decision.value,
                        "legalActionCount": decision.legal_action_count,
                        "modelSha256": engine.model_sha256,
                        "contract": engine.contract
                    }),
                    Err(error) => json!({
                        "id": request.id,
                        "ok": false,
                        "error": error,
                        "modelSha256": engine.model_sha256,
                        "contract": engine.contract
                    }),
                }
            }
            other => json!({
                "id": request.id,
                "ok": false,
                "error": format!("unsupported worker mode {other:?}")
            }),
        };
        write_response(&mut stdout, &response)?;
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("[settlegraph-v2] fatal: {error}");
        std::process::exit(2);
    }
}
