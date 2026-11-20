export function toRpn(s: string): string {
  const left_operand = next_token(s);
  const operator = s[1];
  const right_operand = s[2];
  if (s.length === 1) {
    return left_operand;
  }
  return left_operand + ' ' + right_operand + operator;
}

function next_token(s: string) {
  const i = 0;
  const token = s[i];
  return token;
}
