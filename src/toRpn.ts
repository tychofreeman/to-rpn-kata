export function toRpn(s: string): string {
  const left_operand = s[0];
  if (s.length === 1) {
    return left_operand;
  }
  return left_operand + ' ' + s[2] + s[1];
}
