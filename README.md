# A run of the to-rpn kata

An empty project in which a model performs `kata/fine.md` with the gorefactor
tools, held to them by hooks. The finished project and the kata's history are
on the `main` branch.

## Once

Install the tools from go-refactor-mcp, at a commit that has the TypeScript
guards (PR #743):

    cd <your go-refactor-mcp checkout>
    go install ./cmd/refactor-mcp ./cmd/refactor ./cmd/read-guard ./cmd/write-guard

`refactor-mcp`, `read-guard` and `write-guard` must be on the `PATH` of the
shell that starts Claude Code, and `node` (any recent version, for the gate).

## Each run

    git clone -b scaffold https://github.com/tychofreeman/to-rpn-kata run-1
    cd run-1
    git switch -c run-1
    nvm use            # Node 24, from .nvmrc
    npm ci
    claude

In the session, check `/mcp` shows gorefactor connected, then:

    Perform kata/fine.md, every step from 1.1 to 11.7, as CLAUDE.md says.
    Do not stop to ask questions; where a step cannot be done as written,
    do what CLAUDE.md says for that case and go on.

`.claude/settings.json` starts the server (`.mcp.json`), allows its tools, the
gate, the tests and local commits without prompts, and installs the hooks.

## What a run leaves

    node kata/gate.mjs report

prints the steps declared, the tool steps applied by tool, each call the tools
refused with its text, the calls the gate refused, and each refactor step that
was made by hand with its reason.

- `kata/log.md`: the model's entry per step.
- `kata/by-hand.md`: the reason given for each refactor step made by hand.
- `.kata/calls.jsonl`: every gorefactor call, as the hooks saw it (not
  committed).
- The commits: one per green step, by step number.

To keep a run, push its branch: `git push -u origin run-1`.

## What holds the model to the tools

- `read-guard` and `write-guard` (go-refactor-mcp) refuse reading a `.ts` file
  except with `inspect`, and changing one except through the tools.
- `kata/gate.mjs` refuses, in a refactor step, the tools that restate code
  (`replace_statements`, `replace_declaration`, `replace_expression`,
  `insert_statements`, `replace_text` in TypeScript) until the model gives a
  reason with `node kata/gate.mjs by-hand "..."`. It also refuses any change
  before a step is declared with `node kata/gate.mjs step N`.

It does not check that the steps are taken in order, or that a declared step
is the one being worked on.
