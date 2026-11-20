# Friction log: the first to-rpn session

What got in the way of the `refactor` CLI's TypeScript tools while building
this project (2026-11-19, go-refactor-mcp `main` at 7143d45). Numbers such as
12.1 are request.call in `session.jsonl`; refusal texts are the tool's own.
Entries are in the order they came up. Add later entries at the end.

## Setting up

1. **The first file of an empty project is refused.** With a `tsconfig.json`
   whose `include` matched no file yet, `create_file` of `src/smoke.ts`
   failed: "No inputs were found in config file". Worked around by adding
   `vite.config.ts` to `include`.
2. **`check` is Go only.** `refactor check run_tests=true` in a project with
   no Go: "pattern ./...: directory prefix . does not contain main module".
   Type checks and tests were run with `tsc` and `vitest` directly.
3. **`-n` does not apply.** A dry run of `create_file` printed "-n does not
   apply to TypeScript files" and exited 0.
4. **`list` prints Go's descriptions.** `refactor -C <a TypeScript project>
   list <tool>` gave the Go text and arguments (`extract_type` as moving
   struct fields, `create_from_usage` with optional `names`). The TypeScript
   arguments were seen only in refusals. This is behind most of the guessed
   arguments below.

## A test written first

5. **`create_file` declares no stub for a TypeScript test** (1.1, 1.2). With
   the import: "Cannot find module '../src/toRpn' or its corresponding type
   declarations." Without it: "Cannot find name 'toRpn'. Did you mean 'top'?"
   Go's description promises a stub for what a new test calls.
6. **`create_from_usage` needs `names`** (1.3): "missing names". Optional in
   the text `list` printed.
7. **`create_from_usage` refuses a stub for a module that does not exist**
   (1.4): "toRpn is imported from a module outside the solution, where no stub
   can go". The test had to leave the import out and let the step add it,
   with `to_file` naming the new module (1.5).

## Edits

8. **`insert_statements` takes `line` and `where`** (3.1): "missing where".
   `after_line` was a guess.
9. **A batch step cannot address a line an earlier step rewrote** (3.2):
   "line 4 ... was rewritten by step 1, so it is not there to address". The
   refusal says what to do; the steps were sent in the other order.
10. **`add_field`'s arguments took two refusals** (22.4, 22.5): "the file
    declares no interface, class or object type i", then "field has no
    members". `name` is the class and `field` the member's text.
11. **`add_field` places a field after the methods** (22.6), at the end of
    the class, with no blank line before it.

## Refactorings

12. **`extract_variable` with `all_occurrences` stays in its block** (11.1).
    Pointed at the `s[0]` inside the `if`, it reported 1 occurrence and left
    the one after the `if`. Nothing in the result says another was skipped.
13. **No tool moves a declaration out of a block** (12.1): "const
    left_operand = s[0]; at toRpn.ts:3 is the first statement of its block".
    Done by undoing, extracting from the statement after the `if`, and moving
    that declaration up past the `if`.
14. **No tool uses an existing variable for another occurrence of its
    expression** (12.5). `fold` does this for functions. Done with
    `replace_expression`, which checks types and nothing more.
15. **No tool changes `const` to `let`** (17.1). Done with
    `replace_statements`.
16. **`extract_type` of a function's parameter gives an interface, not a
    class** (21.2): `interface Tokenizer { s: string }`, the parameter as
    `{ s }: Tokenizer`, and `next_token({ s })` at the call.
17. **`function_to_method` refuses what `extract_type` makes** (21.3):
    "next_token's first parameter { s }: Tokenizer is optional, rest,
    defaulted or destructured". The two do not compose towards a class; three
    edits made the interface a class with a constructor, named the parameter,
    and wrote `new Tokenizer(s)` (21.4).
18. **`function_to_method` leaves parentheses** (21.5, 21.6):
    `(new Tokenizer(s)).next_token()`, and after `extract_variable`,
    `(tokenizer).next_token()`. Removed with `replace_expression` (21.7).
19. **A list argument as key=value is read as a string** (21.1): "cannot
    unmarshal string into Go struct field extractTypeArgs.fields of type
    []string". The call was sent again as JSON.
20. **A batch step addressed by `function` fails on a line number** (22.1):
    `extract_variable` with `function: "Tokenizer.next_token"`, after an
    `inline` step: "line 16 out of range: the file has 19 lines". The step
    gave no line. Probably a bug.
21. **`extract_variable` ignores `as=field`** (22.3). It applied, declared a
    local `const` again, and said nothing about `as`.
22. **No tool makes a local a field** (22.6). Done with `replace_statements`
    and `add_field`.
23. **`extract_function` takes statements, not an expression** (25.1). A
    condition became a method by rewriting it against the object, declaring
    the method by hand, and `fold`, which did the checked step.
24. **`move_statement` will not pass a public method that only reads**
    (26.1): "cannot move past what runs between: the call
    tokenizer.next_token() at toRpn.ts:5 may change state, and the call
    tokenizer.end() at toRpn.ts:6 may change state". `end()` returned
    `this.s.length === 1`, and `s` is `readonly`. Done with
    `replace_statements` (26.2).
