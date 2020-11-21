import { parseSchema } from "../";
import { fetchTestCases } from "./cases";

describe("Web3API Schema Binding Test Cases", () => {
  const cases = fetchTestCases();

  for (const test of cases) {

    it(`Case: ${test.name}`, () => {

      const result = parseSchema(test.input);
      expect(result).toMatchObject(test.output);
    });
  }
});
