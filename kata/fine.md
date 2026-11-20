# The to-rpn kata: fine steps

Build `toRpn`, which converts an infix arithmetic expression to the keys you
would press on an RPN calculator, and then evaluates it. This plan gives every
step. `coarse.md` is the same path with one step per stage.

This is the cleaned-up path of the session that first built the project. It has
not yet been performed from this script; where a step does not go as written,
note it.

## Rules

- Do the steps in order, one at a time, and run the tests after each.
- Each step has a kind:
  - **test**: add the test. It must fail.
  - **pass**: write the least code that makes it pass. Every test passes after.
  - **refactor**: change no test and no behavior. Every test passes after. If a
    tool can make the change, use the tool; if you edit by hand, keep the edit
    small.
  - **pin**: add the tests. They should pass at once; if one fails, stop and
    find out why before changing code.
- Commit after every step that ends green.
- Names: functions, methods and variables in `snake_case`, classes in
  `PascalCase`. Use the names given, so later steps can refer to them.

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

## 1. One number, one operator

1.1 **test** `toRpn("1")` is `"1"`.

1.2 **pass** Return the constant `"1"`.

1.3 **test** `toRpn("2")` is `"2"`.

1.4 **pass** Return the input.

1.5 **test** `toRpn("1+2")` is `"1 2+"`.

1.6 **pass** If `s` is one character long, return `s[0]`. Otherwise return
`s[0] + ' ' + s[2] + s[1]`.

## 2. A Tokenizer, by refactoring alone

2.1 **refactor** Extract a variable `left_operand` for `s[0]`, both
occurrences, declared above the `if`.

2.2 **refactor** Extract variables `operator` for `s[1]` and `right_operand`
for `s[2]`, declared below the `if`, in that order.

2.3 **refactor** In `s[0]`, extract a variable `i` for the index `0`.

2.4 **refactor** Extract a function `next_token` from the declarations of `i`
and `left_operand`; it takes `s` and returns the character. Inside it, rename
`left_operand` to `token`.

2.5 **refactor** Create a class `Tokenizer` whose constructor takes the string
`s` and keeps it. Make `next_token` a method of it. `toRpn` creates one
`tokenizer` and calls `tokenizer.next_token()`.

2.6 **refactor** Make `i` a private field of `Tokenizer`, starting at 0.

2.7 **refactor** In `next_token`, increment `this.i` after reading the
character.

2.8 **refactor** In `toRpn`, replace `s[1]` and `s[2]` with calls to
`tokenizer.next_token()`.

2.9 **refactor** Extract `s.length === 1` as a method `end()` of `Tokenizer`.

2.10 **refactor** Change `end()` to compare the index with the length:
`this.i >= this.s.length`.

`toRpn` now reads:

```ts
export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  const left_operand = tokenizer.next_token();
  if (tokenizer.end()) return left_operand;
  const operator = tokenizer.next_token();
  const right_operand = tokenizer.next_token();
  return left_operand + ' ' + right_operand + operator;
}
```

## 3. Numbers of several digits, and spaces

3.1 **refactor** In `next_token`, extract a method `read_one()`: it returns the
current character and advances the index.

3.2 **test** `toRpn("12+3")` is `"12 3+"`.

3.3 **pass** In `next_token`: if the current character is not a digit, return
`this.read_one()`. Otherwise start `token` as an empty string, append
`this.read_one()` while the current character is a digit, and return `token`.

3.4 **refactor** Extract the digit test as a method `is_digit()`.

3.5 **refactor** Extract the declaration of `token`, the loop and the return
as a method `read_number()`.

3.6 **test** `toRpn(" 12 + 3 ")` is `"12 3+"`.

3.7 **pass** At the top of `next_token`: if the current character is a space,
advance the index.

3.8 **refactor** Extract the space test as a method `is_whitespace()`.

3.9 **test** `toRpn("  12   +  3  ")` is `"12 3+"`.

3.10 **pass** Turn that `if` into a `while`.

3.11 **refactor** Extract the loop as a method `skip_whitespace()`.

3.12 **test** `toRpn("12 ")` is `"12"`.

3.13 **pass** `end()` calls `skip_whitespace()` before it compares.

3.14 **refactor** Make every `Tokenizer` method except `next_token` and `end`
private.

## 4. A chain of operators

4.1 **refactor** Declare `let rpn = left_operand` and return `rpn` in both
places.

4.2 **refactor** Replace the last return with
`rpn += ' ' + right_operand + operator;` followed by `return rpn;`.

4.3 **refactor** Invert the `if` so that reading the operator and right operand
and appending them are inside `if (!tokenizer.end())`, with one `return rpn`
after it.

4.4 **test** `toRpn("1 + 2 + 4 + 5")` is `"1 2+ 4+ 5+"`.

4.5 **pass** Turn the `if` into a `while`.

## 5. Precedence

Decide first: what is `1 + 2 * 3` in RPN, and what does `8 / 2 / 2` evaluate
to? (`1 2 3*+`, and 2: operators of equal precedence apply from the left.)

5.1 **refactor** Append in two statements: `rpn += ' ' + right_operand;` then
`rpn += operator;`.

5.2 **refactor** Hold each operator and write it a turn later. Declare
`let pending = "";` before the loop. In the loop, after reading `operator`,
write `rpn += pending;`; replace `rpn += operator;` with
`pending = operator;`. After the loop, `rpn += pending;`.

The loop now reads:

```ts
  let pending = "";
  while (!tokenizer.end()) {
    const operator = tokenizer.next_token();
    rpn += pending;
    const right_operand = tokenizer.next_token();
    rpn += ' ' + right_operand;
    pending = operator;
  }
  rpn += pending;
```

5.3 **refactor** Move `rpn += pending;` and `pending = operator;` together,
directly after reading `operator`.

5.4 **test** `toRpn("1 + 2 * 3")` is `"1 2 3*+"`.

5.5 **pass** If `operator` is `'*'` and `pending` is `'+'`, set
`pending = operator + pending;`. Otherwise do as before
(`rpn += pending; pending = operator;`).

## 6. An operator stack

`pending` is a string used as a stack, top first. Change what it is without
changing what the loop does: first put a function in front of every use.

6.1 **refactor** Add four functions and use them for every use of `pending`:
`empty()` returns `""`; `push(pending, operator)` returns
`operator + pending`; `top(pending)` returns `pending[0]`;
`written(pending)` returns `pending`. The loop's condition is
`operator === '*' && top(pending) === '+'`, its branches are `pending = push(pending, operator);`
and `rpn += written(pending); pending = push(empty(), operator);`.

6.2 **refactor** Inside those four functions only, change the stack to an
array of strings with the top last. `written` joins it from the top down.

6.3 **refactor** Make a class `OperatorStack` that holds the array, and make
`push`, `top` and `written` its methods; `empty()` returns a new one.

6.4 **refactor** Add `has_any()` and `pop()` to `OperatorStack` (`pop` throws
if the stack is empty). `written()` pops each operator as it writes it, so the
stack is empty afterwards, and `push` adds to this stack. In `toRpn`,
`pending` is then a `const`, and both branches end with
`pending.push(operator);`: move it below the `if`.

6.5 **refactor** Make a class `Token` that holds `text`. `next_token` returns
a `Token`; `toRpn` uses `.text` where it needs the string.

6.6 **refactor** Make a class `Operator` that extends `Token`. `Token` gets
`is_operator()`, false, typed `this is Operator`; `Operator` overrides it,
true. A token that is not a number is created as an `Operator`. In `toRpn`,
after reading `operator`, throw `new Error("expected an operator")` unless
`operator.is_operator()`. `OperatorStack` holds `Operator`s.

6.7 **refactor** Extract the condition as a method of `OperatorStack`,
`yields_to(operator)`: whether the operator on top should wait for the new
one. The loop reads
`if (!pending.yields_to(operator)) { rpn += pending.written(); }` then
`pending.push(operator);`.

6.8 **test** `toRpn("1 + 2 * 3 / 4")` is `"1 2 3* 4/+"`.

6.9 **pass** Give `Operator` a method `precedence()`: 1 for `+`, 2 otherwise.
`yields_to` is true when the top's precedence is lower than the new
operator's. Write the waiting operators one at a time:
`while (pending.has_any() && !pending.yields_to(operator)) { rpn += pending.pop().text; }`.

6.10 **refactor** Rename `right_operand` to `operand`.

## 7. The operator table

7.1 **refactor** `precedence()` looks the text up in a table
`precedences`: `+` 1, `*` 2, `/` 2.

7.2 **test** `toRpn("1 - 2 * 3")` is `"1 2 3*-"`.

7.3 **pass** Add `-` to the table, 1.

7.4 **test** `toRpn("1 + 2 * 3 ^ 4")` is `"1 2 3 4^*+"`.

7.5 **pass** Add `^` to the table, 3.

7.6 **test** `toRpn("2 ^ 3 ^ 2")` is `"2 3 2^^"`.

7.7 **pass** In `yields_to`: when the two precedences are equal, the top
yields exactly when the new operator is `^`.

7.8 **refactor** Each table entry becomes an object,
`{ precedence, groups_from_right }`; rename the table `operators` and give the
entries a type `OperatorFacts`. `Operator` gets `groups_from_right()`, and
`yields_to` asks it instead of comparing with `^`.

7.9 **refactor** Each `Operator` looks up its entry once, in its constructor,
and keeps it in a private field `facts`.

7.10 **refactor** Add a function `token_of(text)` that returns an `Operator`
when the table has the text and a `Token` otherwise; `next_token` uses it for
a token that is not a number.

## 8. Parentheses

8.1 **refactor** Extract the body of `toRpn` after the tokenizer is created as
a function `expression(tokenizer)` that returns the string.

8.2 **refactor** Start `rpn` empty and append the first operand as the others
are: `rpn += (rpn === "" ? "" : " ") + operand;`. Use the same statement for
the operand inside the loop.

8.3 **refactor** Make one loop that reads an operand, then an operator:

```ts
function expression(tokenizer: Tokenizer): string {
  let rpn = "";
  const pending = empty();
  while (true) {
    const operand = tokenizer.next_token().text;
    rpn += (rpn === "" ? "" : " ") + operand;
    if (tokenizer.end()) {
      break;
    }
    const operator = tokenizer.next_token();
    if (!operator.is_operator()) {
      throw new Error("expected an operator");
    }
    while (pending.has_any() && !pending.yields_to(operator)) {
      rpn += pending.pop().text;
    }
    pending.push(operator);
  }
  rpn += pending.written();
  return rpn;
}
```

8.4 **test** `toRpn("(1 + 2) * 3")` is `"1 2+ 3*"`.

8.5 **pass** When the operand's token is `(`, the operand is
`expression(tokenizer)`. When the token read as an operator is `)`, leave the
loop, before the check that it is an operator.

8.6 **pin** `toRpn("(((1+3)*(4-9)+1+5)/(1-5))")` is
`"1 3+ 4 9-* 1+ 5+ 1 5-/"`.

8.7 **refactor** Give `Token` methods `opens_group()` and `closes_group()`
and use them for the two comparisons.

## 9. Errors

Each error test expects `toRpn(input)` to throw an `Error` with exactly the
message given.

9.1 **refactor** Each `Token` holds a `position`: the index where it starts,
after any spaces. `next_token` and `token_of` pass it.

9.2 **test** `"+ 1"` throws `expected a number or "(" but found "+" at position 0`.

9.3 **pass** Give `Token` a method `is_number()`. An operand's token that
neither opens a group nor is a number throws that message, built from the
token's text and position.

9.4 **test** `"1 +"` throws `expected a number or "(" but reached the end`.

9.5 **pass** Before reading an operand's token, throw that message if
`tokenizer.end()`.

9.6 **pin** `"   "` throws the same message.

9.7 **refactor** Extract that check and the read as a function
`operand_token(tokenizer)`.

9.8 **test** `"1 2"` throws `expected an operator but found "2" at position 2`.

9.9 **pass** Give the existing `expected an operator` error that message.

9.10 **test** `"(1 + 2"` throws
`expected ")" to close the "(" at position 0 but reached the end`.

9.11 **pass** `expression` takes a second parameter,
`opened_at: number | undefined`: `toRpn` passes `undefined`, the nested call
the position of the `(`. At the end of the input, throw the message if
`opened_at` is not `undefined`.

9.12 **test** `"1 + 2) * 3"` throws
`found ")" at position 5 with no "(" to close`.

9.13 **pass** At a `)`, throw the message if `opened_at` is `undefined`.

`opened_at` now does two jobs: it says where a group opened, and whether there
is a group at all.

9.14 **refactor** Extract the two checks as functions
`input_ended(opened_at)` and `closed_by(opened_at, operator)`.

9.15 **refactor** Replace `opened_at` with a `Group`: an interface with
`input_ended()` and `closed_by(token)`, and two classes. `TopLevel` accepts
the end of the input and throws at a `)`; `Parenthesized` holds `opened_at`,
throws at the end of the input and accepts a `)`. `toRpn` passes
`new TopLevel()`, the nested call `new Parenthesized(token.position)`, and
the loop calls `group.input_ended()` and `group.closed_by(operator)`.

## 10. Decimals and the sign

10.1 **test** `toRpn("1.5 + 2")` is `"1.5 2+"`.

10.2 **pass** `read_number` reads digits and then, if the current character is
`.`, the point and more digits. `is_number()` accepts the same.

10.3 **refactor** Extract `read_digits()` for the two runs of digits.

Decide first: the HP-15C has no key for a negative number; you enter the number
and press CHS. So a minus sign before an operand is the postfix operator `CHS`,
written with no space: `-1 + 2` is `1CHS 2+`.

10.4 **test** `toRpn("-1 + 2")` is `"1CHS 2+"`.

10.5 **pass** Add `CHS` to the table with precedence 3, grouping from the
right, and raise `^` to 4. While the operand's token is `-`, push
`new Operator("CHS", token.position)` on `pending` and read the next operand
token.

10.6 **pin** `"1 - -2.5"` is `"1 2.5CHS-"`; `"-(1 + 2)"` is `"1 2+CHS"`;
`"-2 ^ 2"` is `"2 2^CHS"`; `"-2 * 3"` is `"2CHS 3*"`.

10.7 **refactor** Give `Token` a method `is_minus()` and use it.

## 11. A Calculator that evaluates

11.1 **refactor** In every test that compares a value, ask the result for its
text: `toRpn(x).toString()`. (A string has `toString()`, so the tests still
pass.)

11.2 **refactor** `toRpn` returns a `Calculator`: an exported class that is
given the string and returns it from `toString()`.

11.3 **refactor** `expression` reports to a `Calculator` instead of building a
string. `toRpn` creates the calculator, passes it to `expression`, and returns
it; a nested call gets the same one; `expression` returns nothing. The
calculator has `enter(number)`, which appends the number with a space before
it unless it is the first, and `press(operator)`, which appends the operator.

11.4 **refactor** The `Calculator` holds the keys as a list of `Token`s:
`enter` takes the number's token, `press` an `Operator`, and `toString()`
writes them out by the same rule. `OperatorStack.written()` goes; the loop at
the end of `expression` presses each operator it pops.

11.5 **test** `toRpn("1 + 2").eval()` is `3`.

11.6 **pass** Each row of `operators` gains `operands` (1 for `CHS`, 2 for the
others) and `calculate` (the arithmetic). `Operator.apply(stack)` takes that
many numbers off the end of a stack of numbers and pushes the result.
`Calculator.eval()` runs the keys in order, pushing each number and applying
each operator, and returns what is left.

11.7 **pin**

| Input | `eval()` |
|---|---|
| `1 + 2 * 3` | 7 |
| `8 / 2 / 2` | 2 |
| `2 ^ 3 ^ 2` | 512 |
| `-2 ^ 2` | -4 |
| `1 - -2.5` | 3.5 |
| `(((1+3)*(4-9)+1+5)/(1-5))` | 3.5 |

## Done

34 tests pass. `toRpn` reads:

```ts
export function toRpn(s: string): Calculator {
  const tokenizer = new Tokenizer(s);
  const calculator = new Calculator();
  expression(tokenizer, new TopLevel(), calculator);
  return calculator;
}
```
