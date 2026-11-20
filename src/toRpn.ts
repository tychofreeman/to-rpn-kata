export function toRpn(s: string): string {
  if (s.length === 1) {
    return s[0];
  }
  return s[0] + ' ' + s[2] + s[1];
}
