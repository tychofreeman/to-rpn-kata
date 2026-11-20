import { toRpn } from "../src/toRpn";

describe("toRpn", () => {
  it("leaves a single number as it is", () => {
    expect(toRpn("1")).toBe("1");
  });
  it("leaves another single number as it is", () => {
    expect(toRpn("2")).toBe("2");
  });
  it.skip("converts a parenthesized infix expression to RPN", () => {
    expect(toRpn("(((1+3)*(4-9)+1+5)/(1-5))")).toBe("1 3+4 9-*1+5+ 1 5-/");
  });
});
