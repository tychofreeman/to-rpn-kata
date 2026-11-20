export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  let left_operand = tokenizer.next_token();
  let pending = "";
  while (!tokenizer.end()) {
    const operator = tokenizer.next_token();
    if (pending === '+' && operator === '*') {
      pending = operator + pending;
    } else {
      left_operand += pending;
      pending = operator;
    }
    const right_operand = tokenizer.next_token();
    left_operand += ' ' + right_operand;
  }
  left_operand += pending;
  return left_operand;
}

class Tokenizer {
  constructor(readonly s: string) {}

  next_token() {
    this.skip_whitespace();
    const token = this.is_digit() ? this.read_number() : this.read_one();
    this.skip_whitespace();
    return token;
  }

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
}
