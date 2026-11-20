# The to-rpn kata: coarse steps

Build `toRpn`, which converts an infix arithmetic expression to the keys you
would press on an RPN calculator, and then evaluates it. This plan gives one
step per stage: the tests to add, the refactorings to make, and the decisions
that are already taken. How to get from one test to the next is yours.
`fine.md` is the same path in small steps.

This is the cleaned-up path of the session that first built the project. It has
not yet been performed from this script; where a step does not go as written,
note it.

## Rules

- Test first. Add one test, see it fail, write the least code that passes it,
  then refactor. Refactor only while every test passes.
- A stage's "before" refactorings come before its first test: make the change
  easy, then make the change.
- A refactoring changes no test and no behavior. If a tool can make it, use the
  tool; if you edit by hand, keep the edit small and run the tests.
- Commit after every green step.
- Names: functions, methods and variables in `snake_case`, classes in
  `PascalCase`.

If you perform this with refactoring tools, keep a log per step: the tool
calls, each refusal with its text, and each change made by hand because no tool
made it.

## Setup

An npm project named `to-rpn` on Node 24, TypeScript, tests run by Vitest
(through Vite). `src/toRpn.ts` exports `toRpn(s: string)`;
`test/toRpn.test.ts` holds the tests.

## The output format

- Each operand is written with one space before it, except the first.
- Each operator is written directly after its operands, with no space.

`1 + 2` is `1 2+`. `(1 + 2) * 3` is `1 2+ 3*`. `1 + 2 * 3` is `1 2 3*+`.

## Stages

### 1. One number, one operator

Tests: `"1"` → `"1"`; `"2"` → `"2"`; `"1+2"` → `"1 2+"`.

Pass each with the least code: a constant, then the input, then the three
characters picked out by index.

### 2. A Tokenizer, by refactoring alone

No new tests. Name the three parts (`left_operand`, `operator`,
`right_operand`), then grow a `Tokenizer` class out of the indexing: it holds
the string and an index, `next_token()` returns the next character and
advances, and `end()` says whether the index has passed the last character.
`toRpn` ends up reading three tokens and asking `end()` after the first.

### 3. Numbers of several digits, and spaces

Before: extract `read_one()`, which returns the current character and advances.

Tests, in order: `"12+3"` → `"12 3+"`; `" 12 + 3 "` → `"12 3+"`;
`"  12   +  3  "` → `"12 3+"`; `"12 "` → `"12"`.

After each: extract what you wrote (`is_digit`, `read_number`,
`is_whitespace`, `skip_whitespace`). `end()` skips whitespace before it
answers.

### 4. A chain of operators

Before: give `toRpn` one return, building the result in a variable `rpn`, with
the operator and right operand appended inside an `if`.

Test: `"1 + 2 + 4 + 5"` → `"1 2+ 4+ 5+"`. The `if` becomes a `while`.

### 5. Precedence

Decide first: what is `1 + 2 * 3` in RPN, and what does `8 / 2 / 2` evaluate
to? (`1 2 3*+`, and 2: operators of equal precedence apply from the left.)

Before: append the operand and the operator in two statements; then hold each
operator in a variable `pending` and write it one turn later, so that nothing
else changes when an operator must wait.

Test: `"1 + 2 * 3"` → `"1 2 3*+"`. Writing the pending operator becomes
conditional.

### 6. An operator stack

Before, with no new test: put a function in front of every use of `pending`,
change what it holds inside those functions (a string, then an array), and make
them methods of an `OperatorStack`. Then tokens become objects: `Token` holds
the text, `Operator` extends it, the stack holds `Operator`s, and the condition
becomes `pending.yields_to(operator)`.

Test: `"1 + 2 * 3 / 4"` → `"1 2 3* 4/+"`. Waiting operators are written one at
a time until one yields, and an operator yields only to one of higher
precedence.

### 7. The operator table

Before: precedence comes from a table.

Tests: `"1 - 2 * 3"` → `"1 2 3*-"`; `"1 + 2 * 3 ^ 4"` → `"1 2 3 4^*+"`;
`"2 ^ 3 ^ 2"` → `"2 3 2^^"` (exponents group from the right).

After: one table, `operators`, holds each operator's precedence and whether it
groups from the right; each `Operator` holds its own entry, and a token is an
`Operator` exactly when the table has it.

### 8. Parentheses

Before: the conversion is a function `expression(tokenizer)`; its loop reads an
operand, then an operator, in one place each.

Tests: `"(1 + 2) * 3"` → `"1 2+ 3*"`; then
`"(((1+3)*(4-9)+1+5)/(1-5))"` → `"1 3+ 4 9-* 1+ 5+ 1 5-/"`, which should pass
at once.

A group is an operand: `expression` calls itself for it, and a `)` ends the
loop.

### 9. Errors

Before: each token knows the position in the text where it starts.

Tests, each an input that must throw an `Error` with exactly this message:

| Input | Message |
|---|---|
| `"+ 1"` | `expected a number or "(" but found "+" at position 0` |
| `"1 +"` | `expected a number or "(" but reached the end` |
| `"   "` | `expected a number or "(" but reached the end` |
| `"1 2"` | `expected an operator but found "2" at position 2` |
| `"(1 + 2"` | `expected ")" to close the "(" at position 0 but reached the end` |
| `"1 + 2) * 3"` | `found ")" at position 5 with no "(" to close` |

After the last two: the position where a group opened is doing two jobs (where
it opened, and whether there is a group at all). Replace it with a `Group`:
`TopLevel` and `Parenthesized`, each saying what the end of input and a `)`
mean for it.

### 10. Decimals and the sign

Test: `"1.5 + 2"` → `"1.5 2+"`.

Decide first: the HP-15C has no key for a negative number; you enter the number
and press CHS. So a minus sign before an operand is the postfix operator `CHS`,
written with no space: `-1 + 2` is `1CHS 2+`.

Test: `"-1 + 2"` → `"1CHS 2+"`. `CHS` is one more row of the table, between
multiplication and the exponent, grouping from the right.

Then these should pass at once: `"1 - -2.5"` → `"1 2.5CHS-"`;
`"-(1 + 2)"` → `"1 2+CHS"`; `"-2 ^ 2"` → `"2 2^CHS"`; `"-2 * 3"` → `"2CHS 3*"`.

After: `Token` answers `is_minus()`, `opens_group()` and `closes_group()`.

### 11. A Calculator that evaluates

Before, with no new test: the tests ask the result for its text
(`toRpn(x).toString()`); `toRpn` returns a `Calculator`; `expression` reports
each number (`enter`) and operator (`press`) to it instead of building a
string; the `Calculator` holds the keys as tokens and `toString()` writes them
out.

Test: `toRpn("1 + 2").eval()` is `3`. Each operator's row gains its number of
operands and its arithmetic; `eval()` runs the keys over a stack of numbers.

Then these should pass at once:

| Input | `eval()` |
|---|---|
| `1 + 2 * 3` | 7 |
| `8 / 2 / 2` | 2 |
| `2 ^ 3 ^ 2` | 512 |
| `-2 ^ 2` | -4 |
| `1 - -2.5` | 3.5 |
| `(((1+3)*(4-9)+1+5)/(1-5))` | 3.5 |

## Done

34 tests pass. `toRpn` creates a `Tokenizer` and a `Calculator`, calls
`expression` with a `TopLevel` group, and returns the calculator.
