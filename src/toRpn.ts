export function toRpn(s: string): string {
  let i = 0;
  const left_operand = s[i];
  i++;
  const operator = s[1];
  const right_operand = s[2];
  if (s.length === 1) {
    return left_operand;
  }
  return left_operand + ' ' + right_operand + operator;
}
