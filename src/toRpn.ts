export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  let left_operand = tokenizer.next_token().text;
  let pending = empty();
  while (!tokenizer.end()) {
    const operator = tokenizer.next_token();
    if (pending.top() === '+' && operator.text === '*') {
      pending = pending.push(operator.text);
    } else {
      left_operand += pending.written();
      pending = empty().push(operator.text);
    }
    const right_operand = tokenizer.next_token();
    left_operand += ' ' + right_operand.text;
  }
  left_operand += pending.written();
  return left_operand;
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
  constructor(readonly held: string[]) {}

  top(): string {
    return this.held[this.held.length - 1];
  }

  push(operator: string): OperatorStack {
    return new OperatorStack([...this.held, operator]);
  }

  written(): string {
    return this.held.toReversed().join("");
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
