import { describe, expect, it } from "vitest";

import { JsonAPIParser, type JsonAPIResourceObject } from "../src/parser.js";

describe("JsonAPIParser", () => {
  it("parses a resource with relationships", () => {
    const payload = {
      data: {
        id: "1",
        type: "movie",
        attributes: {
          title: "Das weiße Band - Eine deutsche Kindergeschichte",
        },
        relationships: {
          director: {
            data: { id: "1", type: "person" },
          },
          characters: {
            data: [
              { id: "2", type: "character" },
              { id: "3", type: "character" },
            ],
          },
        },
      },
    };

    const parsed = JsonAPIParser.parse(payload);

    expect(parsed.id).toBe("1");
    expect(parsed.title).toBe(
      "Das weiße Band - Eine deutsche Kindergeschichte",
    );
    expect(parsed.director).toEqual({ id: "1", type: "person" });
    expect(parsed.characters).toEqual([
      { id: "2", type: "character" },
      { id: "3", type: "character" },
    ]);
  });

  it("parses a list of resources", () => {
    const payload = {
      data: [
        {
          id: "1",
          type: "movie",
          attributes: {
            title: "Das weiße Band - Eine deutsche Kindergeschichte",
          },
        },
        {
          id: "2",
          type: "movie",
          attributes: { title: "Funny Games" },
        },
      ],
    };

    const parsed = JsonAPIParser.parse(payload);

    expect(parsed[0]?.id).toBe("1");
    expect(parsed[0]?.title).toBe(
      "Das weiße Band - Eine deutsche Kindergeschichte",
    );
    expect(parsed[1]?.id).toBe("2");
    expect(parsed[1]?.title).toBe("Funny Games");
  });

  it("resolves included relationships recursively, including circular references", () => {
    const payload: {
      data: JsonAPIResourceObject;
      included: JsonAPIResourceObject[];
    } = {
      data: {
        id: "1",
        type: "movie",
        attributes: {
          title: "Das weiße Band - Eine deutsche Kindergeschichte",
        },
        relationships: {
          director: { data: { id: "1", type: "person" } },
          characters: {
            data: [
              { id: "2", type: "character" },
              { id: "3", type: "character" },
            ],
          },
        },
      },
      included: [
        {
          id: "1",
          type: "person",
          attributes: { name: "Michael Haneke" },
          relationships: { favorite_movie: { data: null } },
        },
        {
          id: "2",
          type: "character",
          attributes: { name: "Eva" },
          relationships: {
            movie: { data: { id: "1", type: "movie" } },
            related_character: { data: { id: "3", type: "character" } },
          },
        },
        {
          id: "3",
          type: "character",
          attributes: { name: "Klara" },
          relationships: {
            movie: { data: { id: "1", type: "movie" } },
            related_character: { data: { id: "2", type: "character" } },
          },
        },
      ],
    };

    const parsed = JsonAPIParser.parse(payload);

    expect(parsed.director).toEqual({
      id: "1",
      name: "Michael Haneke",
      favorite_movie: null,
    });
    const characters = parsed.characters as Record<string, unknown>[];
    expect(characters[0]).toEqual({
      id: "2",
      name: "Eva",
      movie: parsed,
      related_character: characters[1],
    });
    expect(characters[1]).toEqual({
      id: "3",
      name: "Klara",
      movie: parsed,
      related_character: characters[0],
    });
  });
});
