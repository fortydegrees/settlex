use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};

use serde_json::Value;
use settlegraph_v2::{EXPECTED_CONTRACT_SHA256, EXPECTED_CTNN_SHA256};

const SEALED_MODEL: &str =
    "/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn";

fn read_response(reader: &mut BufReader<std::process::ChildStdout>) -> Value {
    let mut line = String::new();
    let bytes = reader.read_line(&mut line).expect("read worker response");
    assert!(bytes > 0, "worker exited without a response");
    serde_json::from_str(&line).expect("worker response JSON")
}

#[test]
fn worker_rejects_search_arguments_without_loading_a_model() {
    for unsupported in ["--search", "--thinking"] {
        let output = Command::new(env!("CARGO_BIN_EXE_settlegraph-v2-worker"))
            .args(["--model", "/does/not/exist.ctnn", unsupported, "maximum"])
            .output()
            .expect("run worker argument parser");
        assert!(!output.status.success());
        let stderr = String::from_utf8(output.stderr).expect("worker stderr UTF-8");
        assert!(stderr.contains("unknown worker argument"), "{stderr}");
    }
}

#[test]
#[ignore = "requires the external sealed CTNN-v2 artifact"]
fn worker_preflights_once_and_returns_correlated_health_and_errors() {
    let model =
        std::env::var("SETTLEX_SETTLEGRAPH_V2_MODEL").unwrap_or_else(|_| SEALED_MODEL.to_owned());
    let mut child = Command::new(env!("CARGO_BIN_EXE_settlegraph-v2-worker"))
        .args(["--model", &model])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn worker");
    let mut stdin = child.stdin.take().expect("worker stdin");
    let mut stdout = BufReader::new(child.stdout.take().expect("worker stdout"));

    writeln!(stdin, r#"{{"id":"health-1","mode":"health"}}"#).unwrap();
    stdin.flush().unwrap();
    let health = read_response(&mut stdout);
    assert_eq!(health["id"], "health-1");
    assert_eq!(health["ok"], true);
    assert_eq!(health["modelSha256"], EXPECTED_CTNN_SHA256);
    assert_eq!(
        health["contract"]["contract_sha256"],
        EXPECTED_CONTRACT_SHA256
    );

    writeln!(stdin, r#"{{"id":"bad-1","mode":"decide"}}"#).unwrap();
    stdin.flush().unwrap();
    let error = read_response(&mut stdout);
    assert_eq!(error["id"], "bad-1");
    assert_eq!(error["ok"], false);
    assert!(error["error"].as_str().unwrap().contains("playerId"));

    writeln!(stdin, r#"{{"id":"search-1","mode":"search"}}"#).unwrap();
    stdin.flush().unwrap();
    let unsupported = read_response(&mut stdout);
    assert_eq!(unsupported["id"], "search-1");
    assert_eq!(unsupported["ok"], false);
    assert!(unsupported["error"]
        .as_str()
        .unwrap()
        .contains("unsupported worker mode"));

    child.kill().expect("stop worker");
    child.wait().expect("reap worker");
}
