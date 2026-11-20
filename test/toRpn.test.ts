import { toRpn } from "../src/toRpn";

describe("toRpn", () => {
  it("converts a parenthesized infix expression to RPN", () => {
    expect(toRpn("(((1+3)*(4-9)+1+5)/(1-5))")).toBe("1 3+4 9-*1+5+ 1 5-/");
  });
});
