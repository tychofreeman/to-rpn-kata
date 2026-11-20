export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  return expression(tokenizer);
}

function expression(tokenizer: Tokenizer) {
  let rpn: string;
  const token = tokenizer.next_token();
  if (token.text === '(') {
    rpn = expression(tokenizer);
  } else {
    rpn = token.text;
  }
  const pending = empty();
  while (!tokenizer.end()) {
    const operator = tokenizer.next_token() as Operator;
    if (operator.text === ')') {
      break;
    }
    while (pending.has_any() && !pending.yields_to(operator)) {
      rpn += pending.pop().text;
    }
    pending.push(operator);
    let operand: string;
    const token = tokenizer.next_token();
    if (token.text === '(') {
      operand = expression(tokenizer);
    } else {
      operand = token.text;
    }
    rpn += ' ' + operand;
  }
  rpn += pending.written();
  return rpn;
}

class Tokenizer {
  constructor(readonly s: string) {}

  private skip_whitespace() {
    while (this.is_whitespace()) this.i++;
  }

  private read_number() {
    let token = "";
    while (this.is_digit()) {
      token += this.read_one();
    }
    return token;
  }
  private i = 0;

  end() {
    return this.i >= this.s.length;
  }

  is_digit() {
    return /[0-9]/.test(this.s[this.i]);
  }

  read_one() {
    const char = this.s[this.i];
    this.i++;
    return char;
  }

  is_whitespace() {
    return ' ' === this.s[this.i];
  }

  next_token(): Token {
    this.skip_whitespace();
    const token = this.is_digit() ? new Token(this.read_number()) : new Operator(this.read_one());
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
    for (let top = this.held.pop(); top !== undefined; top = this.held.pop()) {
      text += top.text;
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
  constructor(text: string) {
    this.text = text;
  }
  readonly text: string;
  is_operator(): boolean {
    return false;
  }
}

class Operator extends Token {
  private readonly facts: OperatorFacts;
  constructor(text: string) {
    super(text);
    this.facts = operators[text];
  }
  is_operator(): boolean {
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
  '^': { precedence: 3, groups_from_right: true },
};

type OperatorFacts = { precedence: number; groups_from_right: boolean };
