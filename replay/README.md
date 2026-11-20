# Replay of the first to-rpn session

The first session that built this project was driven one request at a time,
with every change to TypeScript made through the `refactor` CLI of
[go-refactor-mcp](https://github.com/tychofreeman/go-refactor-mcp). This
directory records that session so it can be run again after the TypeScript
engine changes, to see whether the same requests then meet fewer refusals.

- `session.jsonl`: one line per request, in order.
- `run.mjs`: replays it against a `refactor` binary and compares.
- `friction-log.md`: what got in the way, with each refusal's text.

## Running it

    npm install
    node replay/run.mjs --refactor /path/to/refactor
    node replay/run.mjs --only 21,22 --verbose      # some requests, every call shown
    node replay/run.mjs --json out.json             # the results as JSON
    node replay/run.mjs --prompts                   # the requests alone

`npm run replay` runs it with `refactor` from the PATH (or `$REFACTOR`).
Build the binary from a go-refactor-mcp checkout with
`go build -o refactor ./cmd/refactor`. It exits 1 when a call that applied
when recorded is refused now.

Each request runs in its own temporary copy of the project, started from the
files that request started from, so a changed outcome in one request does not
change where the next one starts. For each call it prints what the call did
when recorded and what it does now: `IMPROVED` is refused then, applied now;
`REGRESSED` is the reverse. It then compares the files with the recorded
result, type-checks, and runs the tests.

Two limits:

- A request's later calls are the workarounds found after a refusal. When the
  refused call now applies, those workarounds start from other code and may
  themselves be refused, and the result differs from the recorded one. Read
  that request's lines (`--verbose`) rather than its totals.
- Replaying calls shows whether the same calls now succeed. It does not show
  whether a model would find a shorter route with the new engine. For that,
  give a model the requests in order (`--prompts`) and count its refusals.

## The replay file

Each line of `session.jsonl` is one request:

| key | meaning |
| --- | --- |
| `id` | Its number in the session. |
| `request` | What the user wrote, verbatim. |
| `calls` | The `refactor` calls sent for it, in order. Empty for a question or a commit. |
| `calls[].argv`, `stdin` | The arguments after `refactor -C <dir>`, and standard input, exactly as sent. |
| `calls[].recorded` | `applied`, `refused` or `undone`, with the tool's text in `recorded_message`. |
| `calls[].note` | What the status does not say, such as an option that was ignored. |
| `start_files`, `end_files` | The contents of `src/` and `test/` before and after. |
| `setup_calls` | Calls run first and not counted: the earlier request an `undo` reverts. |
| `expect` | `green` or `red`: the tests after the request. |
| `commit` | The commit the request ended in, if it was committed. |
| `note` | Choices the request left open, and who made them. |

The file was built by sending every call again, in order, from the scaffold
commit, and checking the files after each committed request against that
commit. All matched.

## Baseline

Recorded on 2026-11-19 with `refactor v0.0.0-20261119213012-7143d45927f1`
(go-refactor-mcp `main` at 7143d45), run without `-no-code-by-text` or
`-skeleton-only`, on Node 24.22.3, TypeScript 7.0.2 and Vitest 5.1.1.

| | |
| --- | --- |
| Requests | 27 (24 with calls; 3 were a question, a clarification and a commit) |
| Calls | 47 |
| Applied or undone | 34 |
| Refused | 13 |
| Requests whose first call was not refused | 18 of 24 |
| Requests with a refusal | 6 |

The 13 refusals, by cause:

| Cause | Count | Where (request.call) |
| --- | --- | --- |
| The engine cannot do it, or does it wrongly | 7 | 1.1, 1.2, 1.4, 12.1, 21.3, 22.1, 26.1 |
| An argument name or form was guessed wrong | 5 | 1.3, 3.1, 21.1, 22.4, 22.5 |
| A batch step addressed a line an earlier step rewrote | 1 | 3.2 |

Calls that applied and still fell short (not counted above):

| Where | What happened |
| --- | --- |
| 11.1 | `extract_variable` with `all_occurrences` reached only the `if` block. |
| 21.2 | `extract_type` made an interface, a destructured parameter and an object literal, which `function_to_method` then refused. |
| 21.5, 21.6 | `function_to_method` left `(new Tokenizer(s)).next_token()`, then `(tokenizer).next_token()`. |
| 22.3 | `extract_variable` ignored `as=field` without a word. |
| 22.6 | `add_field` put the field after the method, at the end of the class. |

Changes made by an edit because no refactoring did them: using an existing
variable for another occurrence of its expression (12.5), `const` to `let`
(17.1), an interface to a class with a constructor (21.4), a local to a field
(22.6), an expression to a method on another object (25.1, with `fold` as the
checked step), and a move past a public method that only reads (26.2).

Per request:

| # | Request | Calls | Refused | Commit |
| --- | --- | --- | --- | --- |
| 1 | Let’s write a test first. The input of our fynction under test will... | 5 | 4 | - |
| 2 | Make it pass with the least code. | 1 | 0 | 2365657 |
| 3 | Hmmm. It occurs to me that I should have started with a smaller exa... | 3 | 2 | - |
| 4 | Make the test pass with the smallest amount of code. | 1 | 0 | 3af1edf |
| 5 | Next test has "2" as an input and "2" as the output. Watch it fail,... | 1 | 0 | - |
| 7 | Input: "1+2". Output "1 2+". | 1 | 0 | - |
| 8 | If the string (call it s) is 1 character long, return s.substring(0... | 1 | 0 | - |
| 9 | Indexing is fine. | 1 | 0 | 1d2a91e |
| 10 | Change the s.substring call to another index call. | 1 | 0 | 4a4f2b6 |
| 11 | extract a variable named 'left_operand', equal to s[0]. | 1 | 0 | - |
| 12 | Go ahead and move the declaration up above the if, and then fold th... | 5 | 1 | 45f1c62 |
| 13 | Extract variables for s[1] and s[2]. Name them 'operator' and 'righ... | 1 | 0 | fa442a3 |
| 14 | Move the two new variables to the top, in order of the indexes. | 1 | 0 | c9d74a1 |
| 16 | Extract a variable 'i' for the index '0'. | 1 | 0 | 6ad3d83 |
| 17 | increment i after left_operand is declared | 1 | 0 | 95335a9 |
| 18 | Let's undo that increment. And then extract a method which include ... | 2 | 0 | 419f65c |
| 19 | rename the method to 'next_token'. And rename the left_operand with... | 1 | 0 | e06466c |
| 21 | Go ahead. Tokenizer is perfect. | 7 | 2 | 2d6a8b2 |
| 22 | Let's move i to a class-level variable. | 6 | 3 | fe180b7 |
| 23 | Let's increment this.i within next_token. | 1 | 0 | efea76d |
| 24 | In toRpn, let's replace the s[1] and s[2] with calls to next_token. | 1 | 0 | bd93b92 |
| 25 | Let's extract "s.length === 1" as a method on Tokenizer, calling it... | 1 | 0 | f5a8d87 |
| 26 | Let's move the second and third calls to next_token below the if co... | 2 | 1 | 568f812 |
| 27 | Let's change the end() method to compare this.i with this.s.length. | 1 | 0 | e56187b |

Requests 6, 15 and 20 had no calls.
