import { toRpn } from "../src/toRpn";

describe("toRpn", () => {
  it("leaves a single number as it is", () => {
    expect(toRpn("1")).toBe("1");
  });
  it("leaves another single number as it is", () => {
    expect(toRpn("2")).toBe("2");
  });
  it("puts the operator after its two operands", () => {
    expect(toRpn("1+2")).toBe("1 2+");
  });
  it("reads a number of several digits", () => {
    expect(toRpn("12+3")).toBe("12 3+");
  });
  it("skips spaces around the operands and the operator", () => {
    expect(toRpn(" 12 + 3 ")).toBe("12 3+");
  });
  it("skips runs of several spaces", () => {
    expect(toRpn("  12   +  3  ")).toBe("12 3+");
  });
  it("chains several operators from left to right", () => {
    expect(toRpn("1 + 2 + 4 + 5")).toBe("1 2+ 4+ 5+");
  });
  it("applies a multiplication before the addition it follows", () => {
    expect(toRpn("1 + 2 * 3")).toBe("1 2 3*+");
  });
  it("applies a multiplication and a division from left to right before an addition", () => {
    expect(toRpn("1 + 2 * 3 / 4")).toBe("1 2 3* 4/+");
  });
  it("applies a multiplication before the subtraction it follows", () => {
    expect(toRpn("1 - 2 * 3")).toBe("1 2 3*-");
  });
  it("applies an exponent before the multiplication and the addition it follows", () => {
    expect(toRpn("1 + 2 * 3 ^ 4")).toBe("1 2 3 4^*+");
  });
  it("groups repeated exponents from the right", () => {
    expect(toRpn("2 ^ 3 ^ 2")).toBe("2 3 2^^");
  });
  it("treats a parenthesized sum as one operand", () => {
    expect(toRpn("(1 + 2) * 3")).toBe("1 2+ 3*");
  });
  it.skip("converts a parenthesized infix expression to RPN", () => {
    expect(toRpn("(((1+3)*(4-9)+1+5)/(1-5))")).toBe("1 3+4 9-*1+5+ 1 5-/");
  });
});
