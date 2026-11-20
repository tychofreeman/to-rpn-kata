# to-rpn

Work in this order, refactoring only while every test passes:
1. Make the change easy. Before the first edit, write down:
   - **The easy change:** the few lines you wish you could write to add
     the feature, and the one place they would go.
   - **The places today:** every place you would have to change to add
     it to the code as it is (inspect's `names` and `uses` find them).
     Where it would add a branch beside branches on the same value, or a
     copy of a block with names changed, each existing branch or copy is
     a place.
   - **The refactorings:** if there is more than one place, the
     refactorings, with the gorefactor tools, that make the easy change
     true, each keeping the tests passing. With one place, none.

   Then do those refactorings.
2. Write the next test and see it fail.
3. Make it pass with the least code, with the edit tools
   (replace_statements, insert_statements, add_declaration, create_file).
4. Refactor away the duplication, and rerun the tests.

## Work as a derivation

Treat the code as a structure you reshape with operations. Before
editing, write the change as a list of operations that keep behaviour,
ending in the one small edit that changes it, and send it as one
`batch`. Where no operation does a step, keep the hand edit as small as
it can be.

Moves that work:
- **Near-duplicates:** extract_function from one copy, then `fold` the
  others onto it. Copies that differ only in constants: `parameterize`.
- **Room in a loop:** extract_function the loop together with what it
  builds; the change is then one guard line.
- **Change a representation:** put a getter or setter in front of every
  use (add_declaration, then `fold`), change the representation inside
  it, then remove_dead_code the old field.
- **Move behaviour or change a signature (expand, migrate, contract):**
  add_declaration the new function as a wrapper over the old one,
  `fold` the callers onto it, `inline` the old one with
  all_calls, then rename. For one parameter or result, add_parameter,
  remove_parameter, change_type or add_result do it in one step.
- **A function, method or field a new test uses** is stubbed for you.

## Using the tools

- Load every gorefactor schema you will need in one ToolSearch.
- Read code with `inspect`: a file first (no bodies), then only the
  functions you will change, with `names` or `targets`. Don't search
  before a refactoring; it finds every reference itself.
- Address declarations by name, not line. Use `"check": "end"` when a
  test comes before the code it tests.
- Read refusals: they say what to send instead.
- Run the tests with `check` and `run_tests`; it also type-checks.

## This project and this run

The task is `kata/fine.md`: perform every step, in order, from 1.1 to 11.7.
Its rules apply together with the ones above; where the kata names a step's
kind (test, pass, refactor, pin), do exactly that kind of step.

Dependencies are installed and the project needs Node 24. There is no `src/`
or `test/` yet: step 1.1 creates `test/toRpn.test.ts` and `src/toRpn.ts`.
Tests use Vitest's globals (`describe`, `it`, `expect`, with no import of
them).

### One step at a time, declared

Before each step, say which one you are on:

    node kata/gate.mjs step 3.4

It prints the step. A hook then holds you to the step's kind. In a
**refactor** step, the tools that restate code as you typed it
(`replace_statements`, `replace_declaration`, `replace_expression`,
`insert_statements`, and `replace_text` in TypeScript) are refused: make the
step with refactorings (extract_function, extract_variable, inline, fold,
rename, move, move_statement, invert_if, remove_else, convert_loop, split,
add_parameter, remove_parameter, change_type, function_to_method,
extract_type). `add_declaration` is allowed, since writing a function or
method and then folding code onto it is a refactoring by composition.

When no refactoring and no sequence of two or three makes the change, say so,
and edits by hand are allowed for the rest of that step:

    node kata/gate.mjs by-hand "tried extract_function on lines 12-14 (refused: ...); fold does not apply because ..."

Give the sequences you tried or considered and why each fails. The reason is
kept in `kata/by-hand.md`, and it is what this run is read for, so make it
exact. Do not ask for it before you have looked for a refactoring.

Two hooks also refuse reading a `.ts` file except with `inspect`, and changing
one except through the tools.

### Without the MCP server

If this session has no `mcp__gorefactor__*` tools, the same tools run from the
command line as `tools/refactor`, one call per run, through the same gate:

    tools/refactor inspect file=src/toRpn.ts
    tools/refactor rename file=src/toRpn.ts name=left new_name=left_operand function=toRpn
    tools/refactor extract_function '{"file":"src/toRpn.ts","start_line":3,"end_line":4,"name":"next_token"}'
    tools/refactor check run_tests=true
    tools/refactor undo

Arguments are `key=value`, or one JSON object for lists and nested values.
Code goes in as text: `content_file=-` reads an argument from a heredoc
(`<<'TS'`, delimiter quoted); for a `batch`, send the JSON on stdin
(`tools/refactor batch - <<'EOF'`) with code after it in sections (a line
`@@name` starts one, and `"@name"` in the JSON is that text). Exit status 0
means applied, 2 refused, 1 an error. `tools/TOOLS.md`, where present, holds
each tool's description for TypeScript; `tools/refactor list` prints Go's.

### The log and the commits

Keep `kata/log.md`, one entry per step, written when the step is done: its
kind, each tool called and whether it was applied or refused (with the
refusal's first line), and the number of tests passing after. Where the
kata's step is wrong, unclear or cannot be done as written, say so in that
step's entry, do the nearest thing that keeps the kata's direction, and go on.

Commit after every step that ends green, with a message that starts with the
step's number (`3.4 Extract is_digit`), `kata/log.md` and `kata/by-hand.md`
included. Commit locally only: do not push. Do not look elsewhere on this
machine for a finished version of this project.
