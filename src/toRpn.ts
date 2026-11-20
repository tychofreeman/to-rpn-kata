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
    let token = "";
    const is_number = this.is_digit();
    if (!is_number) {
      return this.read_one();
    }
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
}
