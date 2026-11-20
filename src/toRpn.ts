export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  let rpn = tokenizer.next_token().text;
  const pending = empty();
  while (!tokenizer.end()) {
    const operator = tokenizer.next_token() as Operator;
    while (pending.has_any() && !pending.yields_to(operator)) {
      rpn += pending.pop().text;
    }
    pending.push(operator);
    const operand = tokenizer.next_token();
    rpn += ' ' + operand.text;
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
    return this.top()?.text === '+' && operator.text === '*';
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
  constructor(readonly text: string) {}
  is_operator(): boolean {
    return false;
  }
}

class Operator extends Token {
  is_operator(): boolean {
    return true;
  }
}
