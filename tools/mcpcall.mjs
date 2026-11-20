#!/usr/bin/env node
// Sends tool calls to a refactor-mcp server over stdio, one server per run.
//   mcpcall.mjs -C DIR [-flags "-skeleton-only -no-code-by-text"] list [tool...]
//   mcpcall.mjs -C DIR [-flags "..."] call   < JSON array of {"tool": ..., "args": {...}}
import { spawn } from "node:child_process";
import readline from "node:readline";

const argv = process.argv.slice(2);
let dir = ".", flags = [];
while (argv[0]?.startsWith("-")) {
  const f = argv.shift();
  if (f === "-C") dir = argv.shift();
  else if (f === "-flags") flags = argv.shift().split(/\s+/).filter(Boolean);
}
const mode = argv.shift();
const server = spawn(process.env.REFACTOR_MCP ?? "refactor-mcp", ["-C", dir, ...flags], { stdio: ["pipe", "pipe", "inherit"] });
const pending = new Map();
let nextId = 1;
readline.createInterface({ input: server.stdout }).on("line", (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id !== undefined && m.method) {
    const result = m.method === "roots/list" ? { roots: [{ uri: "file://" + dir, name: "root" }] } : {};
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result }) + "\n");
  } else if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const rpc = (method, params) => new Promise((res) => {
  const id = nextId++; pending.set(id, res);
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});
const text = (m) => m.error ? `ERROR ${JSON.stringify(m.error)}` : (m.result.content ?? []).map((c) => c.text ?? "").join("\n");

const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "mcpcall", version: "0" } });
server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
if (mode === "instructions") {
  console.log(init.result.instructions ?? "");
} else if (mode === "list") {
  const tools = (await rpc("tools/list", {})).result.tools;
  for (const t of tools) {
    if (argv.length && !argv.includes(t.name)) continue;
    if (!argv.length) { console.log(t.name); continue; }
    console.log(`${t.name}\n  ${t.description}`);
    for (const [k, v] of Object.entries(t.inputSchema.properties ?? {})) {
      console.log(`    ${k}${(t.inputSchema.required ?? []).includes(k) ? " (required)" : ""}: ${v.description ?? ""}`);
    }
    console.log("");
  }
} else {
  let input = ""; for await (const chunk of process.stdin) input += chunk;
  const calls = JSON.parse(input);
  for (const [n, c] of calls.entries()) {
    const m = await rpc("tools/call", { name: c.tool, arguments: c.args ?? {} });
    console.log(`=== ${n + 1}. ${c.tool}\n${text(m)}`);
  }
}
server.stdin.end();
