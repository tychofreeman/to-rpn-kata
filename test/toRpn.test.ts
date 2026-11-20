import { toRpn } from "../src/toRpn";

describe("toRpn", () => {
  it("leaves a single number as it is", () => {
    expect(toRpn("1").toString()).toBe("1");
  });
  it("leaves another single number as it is", () => {
    expect(toRpn("2").toString()).toBe("2");
  });
  it("puts the operator after its two operands", () => {
    expect(toRpn("1+2").toString()).toBe("1 2+");
  });
  it("reads a number of several digits", () => {
    expect(toRpn("12+3").toString()).toBe("12 3+");
  });
  it("skips spaces around the operands and the operator", () => {
    expect(toRpn(" 12 + 3 ").toString()).toBe("12 3+");
  });
  it("skips runs of several spaces", () => {
    expect(toRpn("  12   +  3  ").toString()).toBe("12 3+");
  });
  it("chains several operators from left to right", () => {
    expect(toRpn("1 + 2 + 4 + 5").toString()).toBe("1 2+ 4+ 5+");
  });
  it("applies a multiplication before the addition it follows", () => {
    expect(toRpn("1 + 2 * 3").toString()).toBe("1 2 3*+");
  });
  it("applies a multiplication and a division from left to right before an addition", () => {
    expect(toRpn("1 + 2 * 3 / 4").toString()).toBe("1 2 3* 4/+");
  });
  it("applies a multiplication before the subtraction it follows", () => {
    expect(toRpn("1 - 2 * 3").toString()).toBe("1 2 3*-");
  });
  it("applies an exponent before the multiplication and the addition it follows", () => {
    expect(toRpn("1 + 2 * 3 ^ 4").toString()).toBe("1 2 3 4^*+");
  });
  it("groups repeated exponents from the right", () => {
    expect(toRpn("2 ^ 3 ^ 2").toString()).toBe("2 3 2^^");
  });
  it("treats a parenthesized sum as one operand", () => {
    expect(toRpn("(1 + 2) * 3").toString()).toBe("1 2+ 3*");
  });
  it("converts a parenthesized infix expression to RPN", () => {
    expect(toRpn("(((1+3)*(4-9)+1+5)/(1-5))").toString()).toBe("1 3+ 4 9-* 1+ 5+ 1 5-/");
  });
  it("refuses an operator where an operand should be", () => {
    expect(() => toRpn("+ 1")).toThrow(new Error('expected a number or "(" but found "+" at position 0'));
  });
  it("refuses an operator with nothing after it", () => {
    expect(() => toRpn("1 +")).toThrow(new Error('expected a number or "(" but reached the end'));
  });
  it("refuses text that is only spaces", () => {
    expect(() => toRpn("   ")).toThrow(new Error('expected a number or "(" but reached the end'));
  });
  it("refuses two operands with no operator between them", () => {
    expect(() => toRpn("1 2")).toThrow(new Error('expected an operator but found "2" at position 2'));
  });
  it("refuses a group that is never closed", () => {
    expect(() => toRpn("(1 + 2")).toThrow(new Error('expected ")" to close the "(" at position 0 but reached the end'));
  });
  it("refuses a closing parenthesis that closes nothing", () => {
    expect(() => toRpn("1 + 2) * 3")).toThrow(new Error('found ")" at position 5 with no "(" to close'));
  });
  it("reads a number with a decimal point", () => {
    expect(toRpn("1.5 + 2").toString()).toBe("1.5 2+");
  });
  it("writes a minus sign before a number as CHS after it", () => {
    expect(toRpn("-1 + 2").toString()).toBe("1CHS 2+");
  });
  it("tells a subtraction from the sign of the number after it", () => {
    expect(toRpn("1 - -2.5").toString()).toBe("1 2.5CHS-");
  });
  it("changes the sign of a group", () => {
    expect(toRpn("-(1 + 2)").toString()).toBe("1 2+CHS");
  });
  it("applies an exponent before the sign in front of it", () => {
    expect(toRpn("-2 ^ 2").toString()).toBe("2 2^CHS");
  });
  it("applies the sign before a multiplication that follows", () => {
    expect(toRpn("-2 * 3").toString()).toBe("2CHS 3*");
  });
  it("evaluates an addition", () => {
    expect(toRpn("1 + 2").eval()).toBe(3);
  });
});
