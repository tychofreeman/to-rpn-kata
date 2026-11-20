export function toRpn(s: string): string {
  const tokenizer = new Tokenizer(s);
  const left_operand = tokenizer.next_token();
  const operator = s[1];
  const right_operand = s[2];
  if (s.length === 1) {
    return left_operand;
  }
  return left_operand + ' ' + right_operand + operator;
}

class Tokenizer {
  constructor(readonly s: string) {}

  next_token() {
    const i = 0;
    const token = this.s[i];
    return token;
  }
}
