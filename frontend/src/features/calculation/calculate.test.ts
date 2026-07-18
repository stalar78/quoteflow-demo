import { describe, expect, it } from "vitest";
import goldenFixtures from "../../../../fixtures/calculations/golden.json";
import invalidFixtures from "../../../../fixtures/calculations/invalid.json";
import { calculateQuote } from "./calculate";
import { CalculationError } from "./errors";
import type { QuoteCalculationInput } from "./types";

type GoldenFixture = {
  name: string;
  input: QuoteCalculationInput;
  expected: unknown;
};

type InvalidFixture = {
  name: string;
  input: QuoteCalculationInput & { fixtureExpandItemsTo?: number };
  errorCode: string;
};

function expandFixtureInput(fixture: InvalidFixture): QuoteCalculationInput {
  const { fixtureExpandItemsTo, ...input } = fixture.input;
  if (!fixtureExpandItemsTo) {
    return input;
  }

  return {
    ...input,
    items: Array.from({ length: fixtureExpandItemsTo }, (_, index) => ({
      ...input.items[0],
      id: `item-${String(index + 1).padStart(3, "0")}`
    }))
  };
}

describe("calculateQuote", () => {
  it.each((goldenFixtures.cases as GoldenFixture[]).map((fixture) => [fixture.name, fixture]))(
    "matches golden fixture %s",
    (_name, fixture) => {
      expect(calculateQuote(fixture.input)).toEqual(fixture.expected);
    }
  );

  it.each((invalidFixtures.cases as InvalidFixture[]).map((fixture) => [fixture.name, fixture]))(
    "rejects invalid fixture %s",
    (_name, fixture) => {
      expect(() => calculateQuote(expandFixtureInput(fixture))).toThrow(CalculationError);

      try {
        calculateQuote(expandFixtureInput(fixture));
      } catch (error) {
        expect(error).toBeInstanceOf(CalculationError);
        expect((error as CalculationError).code).toBe(fixture.errorCode);
      }
    }
  );

  it("preserves input item order", () => {
    const fixture = (goldenFixtures.cases as GoldenFixture[]).find(
      (candidate) => candidate.name === "several_items"
    );
    expect(fixture).toBeDefined();
    const result = calculateQuote(fixture!.input);
    expect(result.items.map((item) => item.itemId)).toEqual(["item-a", "item-b", "item-c"]);
  });

  it("counts human-readable string length by Unicode code points", () => {
    const fixture = (goldenFixtures.cases as GoldenFixture[])[0];
    const input = {
      ...fixture.input,
      items: [
        {
          ...fixture.input.items[0],
          name: "😀".repeat(160)
        }
      ]
    };

    expect(() => calculateQuote(input)).not.toThrow();
  });
});
