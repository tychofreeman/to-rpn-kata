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
    const is_number = /[0-9]/.test(this.s[this.i]);
    do {
      token += this.s[this.i];
      this.i++;
    } while (is_number && /[0-9]/.test(this.s[this.i]));
    return token;
  }
  private i = 0;

  end() {
    return this.i >= this.s.length;
  }
}
