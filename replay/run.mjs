#!/usr/bin/env node
// Replays replay/session.jsonl against a refactor binary and reports, per
// request, what each recorded call does now compared with what it did when
// the session was recorded.
//
//   node replay/run.mjs [--refactor PATH] [--only 3,12] [--verbose] [--json FILE]
//   node replay/run.mjs --prompts        # the requests alone, to replay as prompts
//
// Each request runs in its own temporary copy of the project, started from
// the files the request started from, so one request's outcome does not
// change the next one's start.

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(here);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};

const refactor = value("--refactor", process.env.REFACTOR ?? "refactor");
const only = value("--only", "")
  .split(",")
  .filter(Boolean)
  .map(Number);
const verbose = flag("--verbose");

const session = fs
  .readFileSync(path.join(here, "session.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (flag("--prompts")) {
  for (const r of session) console.log(`${r.id}. ${r.request}`);
  process.exit(0);
}

if (!fs.existsSync(path.join(repo, "node_modules"))) {
  console.error("node_modules is missing: run `npm install` first.");
  process.exit(2);
}

const bin = (name) => path.join(repo, "node_modules", ".bin", name);

function project(startFiles) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "to-rpn-replay-"));
  for (const f of ["package.json", "package-lock.json", "tsconfig.json", "vite.config.ts"]) {
    fs.copyFileSync(path.join(repo, f), path.join(dir, f));
  }
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(dir, "node_modules"));
  for (const [rel, text] of Object.entries(startFiles)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

function files(dir) {
  const out = {};
  for (const top of ["src", "test"]) {
    const root = path.join(dir, top);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const full = path.join(entry.parentPath, entry.name);
      out[path.relative(dir, full)] = fs.readFileSync(full, "utf8");
    }
  }
  return out;
}

function call(dir, cache, c) {
  const p = spawnSync(refactor, ["-C", dir, ...c.argv], {
    input: c.stdin ?? "",
    encoding: "utf8",
    env: { ...process.env, XDG_CACHE_HOME: cache },
  });
  if (p.error) {
    console.error(`cannot run ${refactor}: ${p.error.message}`);
    process.exit(2);
  }
  const text = `${p.stdout}${p.stderr}`.trim();
  const word = (text.split("\n", 1)[0] ?? "").split(" ", 1)[0].replace(/:$/, "").toLowerCase();
  const status = ["applied", "refused", "undone"].includes(word) ? word : "error";
  return { status, message: text.split("\n--- a/", 1)[0].trim() };
}

function passes(command, commandArgs, dir) {
  return spawnSync(command, commandArgs, { cwd: dir, encoding: "utf8" }).status === 0;
}

function same(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

function label(c) {
  const tool = c.argv[0];
  if (tool !== "batch" || !c.stdin) return tool;
  try {
    const json = JSON.parse(c.stdin.split("\n@@", 1)[0]);
    return `batch(${json.steps.map((s) => s.tool).join(", ")})`;
  } catch {
    return "batch";
  }
}

const ok = (status) => status === "applied" || status === "undone";
const results = [];
const totals = { calls: 0, refusedThen: 0, refusedNow: 0, improved: 0, regressed: 0 };

for (const r of session) {
  if (only.length && !only.includes(r.id)) continue;
  if (!r.calls.length) continue;

  const dir = project(r.start_files);
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), "to-rpn-replay-cache-"));
  for (const c of r.setup_calls ?? []) call(dir, cache, c);

  const calls = r.calls.map((c) => {
    const now = call(dir, cache, c);
    let change = "same";
    if (c.recorded === "refused" && ok(now.status)) change = "IMPROVED";
    else if (ok(c.recorded) && !ok(now.status)) change = "REGRESSED";
    else if (c.recorded !== now.status) change = "changed";
    totals.calls++;
    if (c.recorded === "refused") totals.refusedThen++;
    if (now.status === "refused" || now.status === "error") totals.refusedNow++;
    if (change === "IMPROVED") totals.improved++;
    if (change === "REGRESSED") totals.regressed++;
    return { label: label(c), then: c.recorded, now: now.status, change, message: now.message };
  });

  const sameFiles = same(files(dir), r.end_files);
  const typed = passes(bin("tsc"), ["--noEmit", "-p", dir], dir);
  const green = passes(bin("vitest"), ["run", "--root", dir], dir);
  const state = !typed ? "type errors" : green ? "green" : "red";

  results.push({ id: r.id, request: r.request, calls, sameFiles, state, expect: r.expect });

  const refusedThen = calls.filter((c) => c.then === "refused").length;
  const refusedNow = calls.filter((c) => c.now === "refused" || c.now === "error").length;
  const tags = [];
  if (calls.some((c) => c.change === "IMPROVED")) tags.push("IMPROVED");
  if (calls.some((c) => c.change === "REGRESSED")) tags.push("REGRESSED");
  if (!sameFiles) tags.push("different result");
  if (state !== r.expect) tags.push(`${state}, was ${r.expect}`);
  const short = r.request.length > 60 ? `${r.request.slice(0, 57)}...` : r.request;
  console.log(
    `${String(r.id).padStart(2)}  refused ${refusedThen} -> ${refusedNow}  ${tags.join("; ") || "as recorded"}  | ${short}`,
  );
  for (const c of calls) {
    if (!verbose && c.change === "same") continue;
    console.log(`      ${c.label}: ${c.then} -> ${c.now}${c.change === "same" ? "" : `  [${c.change}]`}`);
    if (c.now !== "applied" && c.now !== "undone") console.log(`        ${c.message.split("\n").join("\n        ")}`);
  }

  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(cache, { recursive: true, force: true });
}

let version = "unknown";
try {
  version = execFileSync(refactor, ["-version"], { encoding: "utf8" }).trim();
} catch {}

console.log("");
console.log(`refactor: ${version}`);
console.log(`calls: ${totals.calls}   refused when recorded: ${totals.refusedThen}   refused now: ${totals.refusedNow}`);
console.log(`improved: ${totals.improved}   regressed: ${totals.regressed}`);
const firstTry = results.filter((r) => ok(r.calls[0].now)).length;
console.log(`requests whose first call was not refused: ${firstTry} of ${results.length}`);
console.log(
  "A call that was refused and now applies changes what the later, recorded workaround calls start from: read such a request's lines, not only its totals.",
);

const out = value("--json", "");
if (out) fs.writeFileSync(out, JSON.stringify({ refactor: version, totals, results }, null, 2));
process.exit(totals.regressed ? 1 : 0);
