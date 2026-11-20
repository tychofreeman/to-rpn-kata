export function toRpn(s: string): Calculator {
  const tokenizer = new Tokenizer(s);
  const calculator = new Calculator();
  expression(tokenizer, undefined, calculator);
  return calculator;
}

function expression(tokenizer: Tokenizer, opened_at: number | undefined, calculator: Calculator): void {
  const pending = empty();
  while (true) {
    let token = operand_token(tokenizer);
    while (token.text === '-') {
      pending.push(new Operator("CHS", token.position));
      token = operand_token(tokenizer);
    }
    if (token.text === '(') {
      expression(tokenizer, token.position, calculator);
    } else if (token.is_number()) {
      calculator.enter(token.text);
    } else {
      throw new Error(`expected a number or "(" but found "${token.text}" at position ${token.position}`);
    }
    if (tokenizer.end()) {
      if (opened_at !== undefined) {
        throw new Error(`expected ")" to close the "(" at position ${opened_at} but reached the end`);
      }
      break;
    }
    const operator = tokenizer.next_token();
    if (operator.text === ')') {
      if (opened_at === undefined) {
        throw new Error(`found ")" at position ${operator.position} with no "(" to close`);
      }
      break;
    }
    if (!operator.is_operator()) {
      throw new Error(`expected an operator but found "${operator.text}" at position ${operator.position}`);
    }
    while (pending.has_any() && !pending.yields_to(operator)) {
      calculator.press(pending.pop().text);
    }
    pending.push(operator);
  }
  calculator.press(pending.written());
}

function operand_token(tokenizer: Tokenizer) {
  if (tokenizer.end()) {
    throw new Error('expected a number or "(" but reached the end');
  }
  const token = tokenizer.next_token();
  return token;
}

class Tokenizer {
  constructor(readonly s: string) {}

  private skip_whitespace() {
    while (this.is_whitespace()) this.i++;
  }

  private read_number() {
    let token = this.read_digits();
    if (this.s[this.i] === '.') {
      token += this.read_one();
      token += this.read_digits();
    }
    return token;
  }

  private read_digits() {
    let token = "";
    while (this.is_digit()) {
      token += this.read_one();
    }
    return token;
  }
  private i = 0;

  end() {
    this.skip_whitespace();
    return this.i >= this.s.length;
  }

  private is_digit() {
    return /[0-9]/.test(this.s[this.i]);
  }

  private read_one() {
    const char = this.s[this.i];
    this.i++;
    return char;
  }

  private is_whitespace() {
    return ' ' === this.s[this.i];
  }

  next_token(): Token {
    this.skip_whitespace();
    const position = this.i;
    const token = this.is_digit() ? new Token(this.read_number(), position) : token_of(this.read_one(), position);
    this.skip_whitespace();
    return token;
  }
}

function empty(): OperatorStack {
  return new OperatorStack([]);
}

class OperatorStack {
  constructor(readonly held: Operator[]) {}

  top(): Operator | undefined {
    return this.held[this.held.length - 1];
  }

  push(operator: Operator): void {
    this.held.push(operator);
  }

  written(): string {
    let text = "";
    while (this.has_any()) {
      text += this.pop().text;
    }
    return text;
  }

  yields_to(operator: Operator): boolean {
    const top = this.top();
    if (top === undefined) {
      return false;
    }
    if (top.precedence() === operator.precedence()) {
      return operator.groups_from_right();
    }
    return top.precedence() < operator.precedence();
  }

  has_any(): boolean {
    return this.held.length > 0;
  }

  pop(): Operator {
    const top = this.held.pop();
    if (top === undefined) {
      throw new Error("the operator stack is empty");
    }
    return top;
  }
}

class Token {
  constructor(text: string, position: number) {
    this.text = text;
    this.position = position;
  }
  readonly text: string;
  readonly position: number;
  is_operator(): this is Operator {
    return false;
  }
  is_number(): boolean {
    return /^[0-9]+(\.[0-9]+)?$/.test(this.text);
  }
}

class Operator extends Token {
  private readonly facts: OperatorFacts;
  constructor(text: string, position: number) {
    super(text, position);
    this.facts = operators[text];
  }
  is_operator(): this is Operator {
    return true;
  }
  precedence(): number {
    return this.facts.precedence;
  }
  groups_from_right(): boolean {
    return this.facts.groups_from_right;
  }
}

const operators: Record<string, OperatorFacts> = {
  '+': { precedence: 1, groups_from_right: false },
  '-': { precedence: 1, groups_from_right: false },
  '*': { precedence: 2, groups_from_right: false },
  '/': { precedence: 2, groups_from_right: false },
  'CHS': { precedence: 3, groups_from_right: true },
  '^': { precedence: 4, groups_from_right: true },
};

type OperatorFacts = { precedence: number; groups_from_right: boolean };

function token_of(text: string, position: number): Token {
  return text in operators ? new Operator(text, position) : new Token(text, position);
}

export class Calculator {
  private keys = "";

  enter(number: string): void {
    this.keys += (this.keys === "" ? "" : " ") + number;
  }

  press(operators: string): void {
    this.keys += operators;
  }

  toString(): string {
    return this.keys;
  }
}
