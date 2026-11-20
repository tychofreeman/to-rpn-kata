export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  const left_operand = tokenizer.next_token();
  if (tokenizer.end()) {
    return left_operand;
  }
  const operator = tokenizer.next_token();
  const right_operand = tokenizer.next_token();
  return left_operand + ' ' + right_operand + operator;
}

class Tokenizer {
  constructor(readonly s: string) {}

  next_token() {
    while (this.is_whitespace()) this.i++;
    if (!this.is_digit()) {
      return this.read_one();
    }
    return this.read_number();
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
