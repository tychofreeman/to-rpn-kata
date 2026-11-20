#!/usr/bin/env node
// The kata's gate and record.
//
//   node kata/gate.mjs step 6.2        say which step you are on; prints the step
//   node kata/gate.mjs by-hand "why"   allow edits by hand for the current step, with the reason
//   node kata/gate.mjs report          what the run did: calls, refusals, edits by hand
//
// It is also the project's Claude Code hook (see .claude/settings.json):
//   gate.mjs hook   PreToolUse on the gorefactor tools: in a refactor step, a
//                   tool that restates code is refused until by-hand gives a reason
//   gate.mjs log    PostToolUse and PostToolUseFailure: record the call
// and tools/refactor asks it the same question for calls from the command line
// (gate.mjs cli <tool> <file holding the arguments>, gate.mjs logcli ...).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(root, ".kata");
const stateFile = path.join(stateDir, "state.json");
const callsFile = path.join(stateDir, "calls.jsonl");
const byHandFile = path.join(root, "kata", "by-hand.md");

// The tools that write code as the caller typed it. In a refactor step they
// are edits by hand, whichever tool carried them.
const RESTATING = new Set(["replace_statements", "replace_declaration", "replace_expression", "replace_text", "insert_statements"]);
// The tools that change nothing, or only take a change back.
const READ_ONLY = new Set(["inspect", "check", "undo", "list"]);

const state = () => {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return undefined; }
};
const record = (entry) => {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.appendFileSync(callsFile, JSON.stringify({ at: new Date().toISOString(), step: state()?.step, ...entry }) + "\n");
};

// steps reads the kata's steps from fine.md: number, kind and text.
function steps() {
  const text = fs.readFileSync(path.join(root, "kata", "fine.md"), "utf8");
  const found = new Map();
  const re = /^(\d+\.\d+) \*\*(test|pass|refactor|pin)\*\*([\s\S]*?)(?=\n\n\d+\.\d+ \*\*|\n\n## |\n*$(?![\s\S]))/gm;
  for (const m of text.matchAll(re)) {
    found.set(m[1], { kind: m[2], text: (m[1] + " **" + m[2] + "**" + m[3]).trim() });
  }
  return found;
}

const isTypeScript = (file) => /\.(ts|tsx|mts|cts)$/.test(file ?? "");

// refusal says why the calls (each a tool and its arguments) may not be made
// now, or is "".
function refusal(calls) {
  const changes = calls.filter((c) => !READ_ONLY.has(c.tool));
  if (changes.length === 0) return "";
  const s = state();
  if (!s) {
    return "Say which step of the kata you are on before changing code: node kata/gate.mjs step 1.1";
  }
  if (s.kind !== "refactor" || s.byHand) return "";
  const restating = changes.filter((c) => {
    if (!RESTATING.has(c.tool)) return false;
    if (c.tool === "replace_text" && !isTypeScript(c.args?.file)) return false; // prose: the log
    if (c.tool === "replace_declaration" && c.args?.content === "") return false; // deleting what nothing uses
    return true;
  });
  if (restating.length === 0) return "";
  const names = [...new Set(restating.map((c) => c.tool))].join(", ");
  return `Step ${s.step} is a refactor step, and ${names} restates code as you typed it: here that is an edit by hand. ` +
    `Make the step with refactorings: extract_function, extract_variable, inline, fold (a function or method written with add_declaration, then folded onto), ` +
    `rename, move, move_statement, invert_if, remove_else, convert_loop, split, add_parameter, remove_parameter, change_type, function_to_method, extract_type. ` +
    `Look for a sequence of two or three before giving up. If none makes the change, say which sequences you tried and why each failed, ` +
    `and edits by hand are allowed for the rest of this step: node kata/gate.mjs by-hand "<sequences tried, and why each failed>"`;
}

// callsOf is the tools a hook's call makes: itself, or a batch's steps.
function callsOf(tool, args) {
  if (tool === "batch") {
    return (args?.steps ?? []).map((st) => ({ tool: st.tool, args: st.args ?? {} }));
  }
  return [{ tool, args: args ?? {} }];
}

const readStdin = () => {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
};

const [mode, ...rest] = process.argv.slice(2);

if (mode === "step") {
  const all = steps();
  const step = all.get(rest[0]);
  if (!step) {
    console.error(`kata/fine.md has no step ${rest[0]}. Its steps run from ${[...all.keys()][0]} to ${[...all.keys()].at(-1)}.`);
    process.exit(1);
  }
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ step: rest[0], kind: step.kind, byHand: false }));
  record({ event: "step", kind: step.kind });
  console.log(step.text);
  if (step.kind === "refactor") {
    console.log("\n(A refactor step: made with refactorings. Tools that restate code are refused until `node kata/gate.mjs by-hand \"...\"` says why none does it.)");
  }
} else if (mode === "by-hand") {
  const s = state();
  const reason = rest.join(" ").trim();
  if (!s) { console.error("Say which step you are on first: node kata/gate.mjs step N"); process.exit(1); }
  if (reason.length < 30) {
    console.error("Give the reason: the sequences of refactorings you tried or considered, and why each does not make this change.");
    process.exit(1);
  }
  if (!fs.existsSync(byHandFile)) {
    fs.writeFileSync(byHandFile, "# Edits by hand\n\nEach refactor step that was made, in whole or part, by restating code, with the reason given.\n");
  }
  fs.appendFileSync(byHandFile, `\n- **${s.step}** ${reason}\n`);
  fs.writeFileSync(stateFile, JSON.stringify({ ...s, byHand: true }));
  record({ event: "by-hand", reason });
  console.log(`Edits by hand are allowed for the rest of step ${s.step}. Recorded in kata/by-hand.md.`);
} else if (mode === "hook") {
  let call;
  try { call = JSON.parse(readStdin()); } catch { process.exit(0); }
  const tool = (call.tool_name ?? "").replace(/^mcp__gorefactor__/, "");
  if (tool === call.tool_name) process.exit(0); // not a gorefactor tool
  const why = refusal(callsOf(tool, call.tool_input));
  if (why) {
    record({ event: "gate", tool });
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: why } }));
  }
} else if (mode === "log") {
  let call;
  try { call = JSON.parse(readStdin()); } catch { process.exit(0); }
  const tool = (call.tool_name ?? "").replace(/^mcp__gorefactor__/, "");
  if (tool === call.tool_name) process.exit(0);
  const said = typeof call.error === "string" ? call.error : JSON.stringify(call.tool_response ?? "");
  const failed = call.hook_event_name === "PostToolUseFailure" || /REFUSED/.test(said.slice(0, 200));
  record({
    event: failed ? "refused" : "applied", tool,
    steps: tool === "batch" ? callsOf(tool, call.tool_input).map((c) => c.tool) : undefined,
    said: failed ? said.replace(/\\n/g, " ").slice(0, 300) : undefined,
  });
} else if (mode === "cli") {
  // gate.mjs cli <tool> <file>: the file holds the command line's arguments,
  // one per line, then a line "--stdin--" and what was sent on stdin.
  const tool = rest[0];
  const [argText, stdinText = ""] = fs.readFileSync(rest[1], "utf8").split("\n--stdin--\n");
  let args = {};
  const words = argText.split("\n").filter(Boolean);
  const json = words.find((w) => w.startsWith("{")) ?? (stdinText.trimStart().startsWith("{") ? stdinText.split(/^@@/m)[0] : undefined);
  try {
    if (json) args = JSON.parse(json);
    else for (const w of words) { const i = w.indexOf("="); if (i > 0) args[w.slice(0, i)] = w.slice(i + 1); }
  } catch { /* judged by the tool's name alone */ }
  if (args.content === "-" || args.content_file === "-") args.content = stdinText;
  const why = refusal(callsOf(tool, args));
  if (why) {
    record({ event: "gate", tool });
    console.log("REFUSED by the kata's gate: " + why);
    process.exit(2);
  }
} else if (mode === "logcli") {
  // gate.mjs logcli <tool> <exit status> <first line of the output>
  const [tool, status, ...said] = rest;
  if (!READ_ONLY.has(tool) || status !== "0") {
    record({ event: status === "0" ? "applied" : status === "2" ? "refused" : "error", tool, said: status === "0" ? undefined : said.join(" ").slice(0, 300) });
  } else {
    record({ event: "applied", tool });
  }
} else if (mode === "report") {
  let lines = [];
  try { lines = fs.readFileSync(callsFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)); } catch { /* no calls yet */ }
  const count = (list, key) => {
    const m = new Map();
    for (const x of list) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const applied = lines.filter((l) => l.event === "applied");
  const refused = lines.filter((l) => l.event === "refused");
  const gated = lines.filter((l) => l.event === "gate");
  const byHand = lines.filter((l) => l.event === "by-hand");
  const stepsSeen = new Set(lines.filter((l) => l.event === "step").map((l) => l.step));
  const tools = applied.flatMap((l) => l.tool === "batch" ? (l.steps ?? ["batch"]) : [l.tool]);
  console.log(`Steps declared: ${stepsSeen.size} of ${steps().size}`);
  console.log(`Calls applied: ${applied.length} (${tools.length} tool steps, batches opened up)`);
  for (const [t, n] of count(tools, (t) => t)) console.log(`  ${String(n).padStart(4)}  ${t}${RESTATING.has(t) ? "   (restates code)" : ""}`);
  console.log(`Calls refused by the tools: ${refused.length}`);
  for (const r of refused) console.log(`  ${r.step ?? "?"}  ${r.tool}: ${(r.said ?? "").slice(0, 160)}`);
  console.log(`Calls refused by the gate: ${gated.length}`);
  for (const [s, n] of count(gated, (g) => g.step ?? "before any step")) console.log(`  ${s}: ${n}`);
  console.log(`Refactor steps with edits by hand: ${byHand.length} (reasons in kata/by-hand.md)`);
  for (const b of byHand) console.log(`  ${b.step}: ${b.reason.slice(0, 160)}`);
} else {
  console.error("usage: node kata/gate.mjs step N | by-hand \"reason\" | report");
  process.exit(1);
}
