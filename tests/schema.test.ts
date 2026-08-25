import { describe, expect, it } from "vitest";

import {
  JsonAPIError,
  JsonAPIResourceIdentifier,
  JsonAPIResourceSchema,
} from "../src/schema.js";

describe("JsonAPIResourceSchema", () => {
  it("parses a valid resource", () => {
    expect(JsonAPIResourceSchema.parse({ id: "123" })).toEqual({ id: "123" });
  });

  it("requires id", () => {
    expect(() => JsonAPIResourceSchema.parse({})).toThrow();
  });
});

describe("JsonAPIResourceIdentifier", () => {
  it("parses a valid identifier", () => {
    expect(
      JsonAPIResourceIdentifier.parse({ id: "123", type: "movies" }),
    ).toEqual({ id: "123", type: "movies" });
  });

  it("requires id", () => {
    expect(() => JsonAPIResourceIdentifier.parse({ type: "movies" })).toThrow();
  });

  it("requires type", () => {
    expect(() => JsonAPIResourceIdentifier.parse({ id: "123" })).toThrow();
  });
});

describe("JsonAPIError", () => {
  it("parses a valid error", () => {
    expect(
      JsonAPIError.parse({
        status: "422",
        detail: "Year can't be blank",
        code: "invalid",
      }),
    ).toEqual({
      status: "422",
      detail: "Year can't be blank",
      code: "invalid",
    });
  });

  it("requires status", () => {
    expect(() =>
      JsonAPIError.parse({ detail: "Year can't be blank", code: "invalid" }),
    ).toThrow();
  });

  it("requires detail", () => {
    expect(() =>
      JsonAPIError.parse({ status: "422", code: "invalid" }),
    ).toThrow();
  });

  it("requires code", () => {
    expect(() =>
      JsonAPIError.parse({ status: "422", detail: "Year can't be blank" }),
    ).toThrow();
  });
});
