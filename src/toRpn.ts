export function toRpn(s: string): string {
  const left_operand = s[0];
  if (s.length === 1) {
    return left_operand;
  }
  const operator = s[1];
  const right_operand = s[2];
  return left_operand + ' ' + right_operand + operator;
}
