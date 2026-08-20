import { describe, expect, it } from "vitest";

import { JsonAPISerializer } from "../src/serializer.js";

describe("JsonAPISerializer", () => {
  it("serializes an attribute", () => {
    expect(JsonAPISerializer.toJsonAPI({ name: "Lana Wachowski" })).toEqual({
      data: { attributes: { name: "Lana Wachowski" } },
    });
  });

  it("serializes a null attribute", () => {
    expect(JsonAPISerializer.toJsonAPI({ gender: null })).toEqual({
      data: { attributes: { gender: null } },
    });
  });

  it("serializes a list attribute", () => {
    expect(JsonAPISerializer.toJsonAPI({ sequence: [1, 2, 3] })).toEqual({
      data: { attributes: { sequence: [1, 2, 3] } },
    });
  });

  it("serializes a relationship", () => {
    expect(
      JsonAPISerializer.toJsonAPI({ director: { id: "1", type: "person" } }),
    ).toEqual({
      data: {
        relationships: { director: { data: { id: "1", type: "person" } } },
      },
    });
  });

  it("serializes a relationship removal", () => {
    expect(JsonAPISerializer.toJsonAPI({ director: { id: null } })).toEqual({
      data: { relationships: { director: { data: null } } },
    });
  });

  it("serializes a list of relationships", () => {
    expect(
      JsonAPISerializer.toJsonAPI({
        directors: [
          { id: "1", type: "person" },
          { id: "2", type: "person" },
        ],
      }),
    ).toEqual({
      data: {
        relationships: {
          directors: {
            data: [
              { id: "1", type: "person" },
              { id: "2", type: "person" },
            ],
          },
        },
      },
    });
  });

  it("drops null-id entries from a list of relationships", () => {
    expect(JsonAPISerializer.toJsonAPI({ children: [{ id: null }] })).toEqual({
      data: { relationships: { children: { data: [] } } },
    });
  });
});
