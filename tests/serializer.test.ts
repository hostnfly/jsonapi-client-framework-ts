import { describe, expect, it } from "vitest";

import { JsonAPIModel } from "../src/model.js";
import { JsonAPISerializer } from "../src/serializer.js";

class Person extends JsonAPIModel {
  static readonly type = "person";
  declare name?: string;
}

class Character extends JsonAPIModel {
  static readonly type = "character";
  declare type?: string;
  declare name?: string;
  declare actor?: Person | null;
}

class Movie extends JsonAPIModel {
  static readonly type = "movie";
  declare title?: string;
  declare year?: number | null;
  declare credits?: { id: string; name: string };
  declare director?: Person | null;
  declare producers?: (Person | { id: string })[];
  declare characters?: (Character | { name: string })[];
}

class Untyped extends JsonAPIModel {}

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

  it("serializes an object attribute", () => {
    expect(
      JsonAPISerializer.toJsonAPI({ title: { en: "Jurassic Park", fr: "" } }),
    ).toEqual({
      data: { attributes: { title: { en: "Jurassic Park", fr: "" } } },
    });
  });

  it("serializes a nested object attribute", () => {
    const address = {
      city: "Paris",
      geo: { lat: 48.85, lng: 2.35 },
      tags: ["center", "historic"],
      zip: null,
    };

    expect(JsonAPISerializer.toJsonAPI({ address })).toEqual({
      data: { attributes: { address } },
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

  it("omits an undefined attribute", () => {
    expect(
      JsonAPISerializer.toJsonAPI({ title: undefined, year: 1993 }),
    ).toEqual({ data: { attributes: { year: 1993 } } });
  });
});

describe("JsonAPISerializer with a model", () => {
  it("builds an instance of the model class", () => {
    expect(Movie.build({ year: 1993 })).toBeInstanceOf(Movie);
  });

  it("recognizes a model from another copy of the package", () => {
    class OtherCopyModel {
      year = 1993;
    }
    Object.defineProperty(
      OtherCopyModel,
      Symbol.for("jsonapi-client-framework-ts.model"),
      { value: true },
    );
    Object.defineProperty(OtherCopyModel, "type", { value: "movie" });

    expect(
      JsonAPISerializer.toJsonAPI(
        new OtherCopyModel() as unknown as JsonAPIModel,
      ).data.type,
    ).toBe("movie");
  });

  it("sends the model type as data.type", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ year: 1993 })).data.type,
    ).toBe("movie");
  });

  it("sends the model id as data.id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ id: "179", year: 1993 })).data
        .id,
    ).toBe("179");
  });

  it("sends the id from the options over the model id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ id: "1", year: 1993 }), {
        id: "179",
      }).data.id,
    ).toBe("179");
  });

  it("does not send data.id without an id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ year: 1993 })).data,
    ).not.toHaveProperty("id");
  });

  it("rejects a model class without a static type", () => {
    expect(() => JsonAPISerializer.toJsonAPI(Untyped.build())).toThrow(
      "Model Untyped needs a static type",
    );
  });

  it("sends a field without model instances as an attribute", () => {
    expect(JsonAPISerializer.toJsonAPI(Movie.build({ year: 1993 }))).toEqual({
      data: { type: "movie", attributes: { year: 1993 } },
    });
  });

  it("sends an object with an id key as an attribute", () => {
    const credits = { id: "9", name: "Universal" };

    expect(JsonAPISerializer.toJsonAPI(Movie.build({ credits }))).toEqual({
      data: { type: "movie", attributes: { credits } },
    });
  });

  it("omits an undefined attribute", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        Movie.build({ year: undefined, title: "Jurassic Park" }),
      ).data.attributes,
    ).toEqual({ title: "Jurassic Park" });
  });

  it("sends a null attribute", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ year: null })).data.attributes,
    ).toEqual({ year: null });
  });

  it("sends no attributes member when every attribute is undefined", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ year: undefined })).data,
    ).not.toHaveProperty("attributes");
  });

  it("omits an undefined relationship", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ director: undefined }), {
        included: ["director"],
      }),
    ).toEqual({ data: { type: "movie" } });
  });

  it("sends a model instance as a to-one relationship identifier", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        Movie.build({ director: Person.build({ id: "5" }) }),
      ).data.relationships,
    ).toEqual({ director: { data: { type: "person", id: "5" } } });
  });

  it("sends a list of model instances as to-many relationship identifiers", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        Movie.build({
          producers: [Person.build({ id: "1" }), Person.build({ id: "2" })],
        }),
      ).data.relationships,
    ).toEqual({
      producers: {
        data: [
          { type: "person", id: "1" },
          { type: "person", id: "2" },
        ],
      },
    });
  });

  it("sends no included for a relationship that is not included", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        Movie.build({ director: Person.build({ id: "5", name: "Spielberg" }) }),
      ),
    ).not.toHaveProperty("included");
  });

  it("rejects a related resource without an id when the relationship is not included", () => {
    expect(() =>
      JsonAPISerializer.toJsonAPI(
        Movie.build({ director: Person.build({ name: "Spielberg" }) }),
      ),
    ).toThrow('Relationship "director" is not included');
  });

  it("rejects a list mixing model instances and plain objects", () => {
    expect(() =>
      JsonAPISerializer.toJsonAPI(
        Movie.build({ producers: [Person.build({ id: "1" }), { id: "2" }] }),
      ),
    ).toThrow('Relationship "producers" expects model instances');
  });

  it("rejects a plain object in an included relationship", () => {
    expect(() =>
      JsonAPISerializer.toJsonAPI(
        Movie.build({ characters: [{ name: "Alan Grant" }] }),
        { included: ["characters"] },
      ),
    ).toThrow('Relationship "characters" expects model instances');
  });

  it("empties a to-one relationship with null when it is included", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ director: null }), {
        included: ["director"],
      }).data.relationships,
    ).toEqual({ director: { data: null } });
  });

  it("empties a to-many relationship with an empty list when it is included", () => {
    expect(
      JsonAPISerializer.toJsonAPI(Movie.build({ characters: [] }), {
        included: ["characters"],
      }),
    ).toEqual({
      data: { type: "movie", relationships: { characters: { data: [] } } },
    });
  });

  it("sends an included related resource in full, paired by id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        Movie.build({
          characters: [Character.build({ id: "7", name: "Ellie Sattler" })],
        }),
        { included: ["characters"] },
      ),
    ).toEqual({
      data: {
        type: "movie",
        relationships: {
          characters: { data: [{ type: "character", id: "7" }] },
        },
      },
      included: [
        { type: "character", id: "7", attributes: { name: "Ellie Sattler" } },
      ],
    });
  });

  it("generates a lid for a new included related resource", () => {
    const { data, included } = JsonAPISerializer.toJsonAPI(
      Movie.build({ characters: [Character.build({ name: "Alan Grant" })] }),
      { included: ["characters"] },
    );

    expect(data.relationships).toEqual({
      characters: { data: [{ type: "character", lid: "1" }] },
    });
    expect(included).toEqual([
      { type: "character", lid: "1", attributes: { name: "Alan Grant" } },
    ]);
  });

  it("generates a distinct lid for each new included related resource", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({
        characters: [
          Character.build({ name: "Alan Grant" }),
          Character.build({ name: "Ian Malcolm" }),
        ],
      }),
      { included: ["characters"] },
    );

    expect(included?.map((resource) => resource.lid)).toEqual(["1", "2"]);
  });

  it("sends an empty attributes member for an included related resource without attributes", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({ characters: [Character.build({ id: "7" })] }),
      { included: ["characters"] },
    );

    expect(included).toEqual([{ type: "character", id: "7", attributes: {} }]);
  });

  it("omits an undefined attribute of an included related resource", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({
        characters: [Character.build({ id: "7", name: undefined })],
      }),
      { included: ["characters"] },
    );

    expect(included).toEqual([{ type: "character", id: "7", attributes: {} }]);
  });

  it("does not send id or type of an included related resource as attributes", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({
        characters: [
          Character.build({
            id: "7",
            type: "character",
            name: "Ellie Sattler",
          }),
        ],
      }),
      { included: ["characters"] },
    );

    expect(included?.[0].attributes).toEqual({ name: "Ellie Sattler" });
  });

  it("sends a relationship of an included resource as an identifier when its path is not included", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({
        characters: [
          Character.build({ id: "7", actor: Person.build({ id: "3" }) }),
        ],
      }),
      { included: ["characters"] },
    );

    expect(included).toEqual([
      {
        type: "character",
        id: "7",
        attributes: {},
        relationships: { actor: { data: { type: "person", id: "3" } } },
      },
    ]);
  });

  it("sends nested related resources in the same included with a dotted path", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({
        characters: [
          Character.build({
            id: "7",
            actor: Person.build({ name: "Laura Dern" }),
          }),
        ],
      }),
      { included: ["characters.actor"] },
    );

    expect(included).toEqual(
      expect.arrayContaining([
        {
          type: "character",
          id: "7",
          attributes: {},
          relationships: { actor: { data: { type: "person", lid: "1" } } },
        },
        { type: "person", lid: "1", attributes: { name: "Laura Dern" } },
      ]),
    );
  });

  it("sends a resource only once in included when it is repeated", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      Movie.build({
        characters: [
          Character.build({ id: "7", actor: Person.build({ id: "3" }) }),
          Character.build({ id: "8", actor: Person.build({ id: "3" }) }),
        ],
      }),
      { included: ["characters.actor"] },
    );

    expect(
      included?.filter((resource) => resource.type === "person"),
    ).toHaveLength(1);
  });
});
