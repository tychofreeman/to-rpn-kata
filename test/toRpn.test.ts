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
  it.skip("converts a parenthesized infix expression to RPN", () => {
    expect(toRpn("(((1+3)*(4-9)+1+5)/(1-5))")).toBe("1 3+4 9-*1+5+ 1 5-/");
  });
});
