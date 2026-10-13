import { describe, expect, it } from "vitest";

import { JsonAPIModel } from "../src/model.js";
import { JsonAPISerializer } from "../src/serializer.js";

class Person extends JsonAPIModel {
  static readonly type = "person";
  declare name?: string;
}

class Bed extends JsonAPIModel {
  static readonly type = "bed";
  declare bed_type?: string;
}

class Room extends JsonAPIModel {
  static readonly type = "room";
  static readonly relationships = { beds: { model: Bed, included: true } };
  declare type?: string;
  declare room_type?: string;
  declare beds?: (Bed | { id?: string; bed_type?: string })[];
}

class RentalUnit extends JsonAPIModel {
  static readonly type = "rental_unit";
  static readonly relationships = {
    rooms: { model: Room, included: true },
    owner: { model: Person },
    managers: { model: Person },
  };
  declare floor?: number | null;
  declare surface_area?: number;
  declare contact?: { id: string; name: string };
  declare rooms?: (Room | { id?: string; room_type?: string })[];
  declare owner?: Person | null;
  declare managers?: (Person | { id?: string; name?: string })[];
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
    expect(RentalUnit.build({ floor: 2 })).toBeInstanceOf(RentalUnit);
  });

  it("recognizes a model from another copy of the package", () => {
    class OtherCopyModel {
      floor = 2;
    }
    Object.defineProperty(
      OtherCopyModel,
      Symbol.for("jsonapi-client-framework-ts.model"),
      { value: true },
    );
    Object.defineProperty(OtherCopyModel, "type", { value: "rental_unit" });

    expect(
      JsonAPISerializer.toJsonAPI(
        new OtherCopyModel() as unknown as JsonAPIModel,
      ).data.type,
    ).toBe("rental_unit");
  });

  it("sends the model type as data.type", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ floor: 2 })).data.type,
    ).toBe("rental_unit");
  });

  it("sends the model id as data.id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ id: "123", floor: 2 }))
        .data.id,
    ).toBe("123");
  });

  it("sends the id from the options over the model id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ id: "1", floor: 2 }), {
        id: "123",
      }).data.id,
    ).toBe("123");
  });

  it("does not send data.id without an id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ floor: 2 })).data,
    ).not.toHaveProperty("id");
  });

  it("rejects a model class without a static type", () => {
    expect(() => JsonAPISerializer.toJsonAPI(Untyped.build())).toThrow(
      "Model Untyped needs a static type",
    );
  });

  it("sends an undeclared field as an attribute", () => {
    expect(JsonAPISerializer.toJsonAPI(RentalUnit.build({ floor: 2 }))).toEqual(
      {
        data: { type: "rental_unit", attributes: { floor: 2 } },
      },
    );
  });

  it("sends an undeclared object with an id key as an attribute", () => {
    const contact = { id: "9", name: "Alan" };

    expect(JsonAPISerializer.toJsonAPI(RentalUnit.build({ contact }))).toEqual({
      data: { type: "rental_unit", attributes: { contact } },
    });
  });

  it("omits an undefined attribute", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({ floor: undefined, surface_area: 40 }),
      ).data.attributes,
    ).toEqual({ surface_area: 40 });
  });

  it("sends a null attribute", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ floor: null })).data
        .attributes,
    ).toEqual({ floor: null });
  });

  it("sends no attributes member when every attribute is undefined", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ floor: undefined })).data,
    ).not.toHaveProperty("attributes");
  });

  it("omits an undefined relationship", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ rooms: undefined })),
    ).toEqual({ data: { type: "rental_unit" } });
  });

  it("sends the identifiers of a to-many relationship by id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({
          managers: [Person.build({ id: "1" }), Person.build({ id: "2" })],
        }),
      ).data.relationships,
    ).toEqual({
      managers: {
        data: [
          { type: "person", id: "1" },
          { type: "person", id: "2" },
        ],
      },
    });
  });

  it("accepts plain objects as relationship items", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ managers: [{ id: "1" }] }))
        .data.relationships,
    ).toEqual({ managers: { data: [{ type: "person", id: "1" }] } });
  });

  it("sends no included for a relationship that sends identifiers only", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({ managers: [Person.build({ id: "1" })] }),
      ),
    ).not.toHaveProperty("included");
  });

  it("rejects an identifiers-only relationship item without an id", () => {
    expect(() =>
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({ managers: [Person.build({ name: "Alan" })] }),
      ),
    ).toThrow('Relationship "managers" sends identifiers only');
  });

  it("sends a to-one relationship", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({ owner: Person.build({ id: "9" }) }),
      ).data.relationships,
    ).toEqual({ owner: { data: { type: "person", id: "9" } } });
  });

  it("empties a to-one relationship with null", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ owner: null })).data
        .relationships,
    ).toEqual({ owner: { data: null } });
  });

  it("empties a to-many relationship with an empty list", () => {
    expect(
      JsonAPISerializer.toJsonAPI(RentalUnit.build({ rooms: [] })),
    ).toEqual({
      data: { type: "rental_unit", relationships: { rooms: { data: [] } } },
    });
  });

  it("rejects a relationship value that is not an object", () => {
    expect(() =>
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({ owner: "9" as unknown as Person }),
      ),
    ).toThrow('Relationship "owner" expects an object');
  });

  it("sends an existing related resource in included, paired by id", () => {
    expect(
      JsonAPISerializer.toJsonAPI(
        RentalUnit.build({
          rooms: [Room.build({ id: "10", room_type: "bedroom" })],
        }),
      ),
    ).toEqual({
      data: {
        type: "rental_unit",
        relationships: { rooms: { data: [{ type: "room", id: "10" }] } },
      },
      included: [
        { type: "room", id: "10", attributes: { room_type: "bedroom" } },
      ],
    });
  });

  it("generates a lid for a new related resource", () => {
    const { data, included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({ rooms: [Room.build({ room_type: "kitchen" })] }),
    );

    expect(data.relationships).toEqual({
      rooms: { data: [{ type: "room", lid: "1" }] },
    });
    expect(included).toEqual([
      { type: "room", lid: "1", attributes: { room_type: "kitchen" } },
    ]);
  });

  it("generates a distinct lid for each new related resource", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({
        rooms: [
          Room.build({ room_type: "kitchen" }),
          Room.build({ room_type: "bedroom" }),
        ],
      }),
    );

    expect(included?.map((resource) => resource.lid)).toEqual(["1", "2"]);
  });

  it("sends an empty attributes member for a related resource without attributes", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({ rooms: [Room.build({ id: "10" })] }),
    );

    expect(included).toEqual([{ type: "room", id: "10", attributes: {} }]);
  });

  it("omits an undefined attribute of a related resource", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({
        rooms: [Room.build({ id: "10", room_type: undefined })],
      }),
    );

    expect(included).toEqual([{ type: "room", id: "10", attributes: {} }]);
  });

  it("does not send id or type of a related resource as attributes", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({
        rooms: [Room.build({ id: "10", type: "room", room_type: "bedroom" })],
      }),
    );

    expect(included?.[0].attributes).toEqual({ room_type: "bedroom" });
  });

  it("sends nested related resources in the same included", () => {
    const { data, included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({
        rooms: [
          Room.build({
            id: "10",
            room_type: "bedroom",
            beds: [Bed.build({ bed_type: "beds_double" })],
          }),
        ],
      }),
    );

    expect(data.relationships).toEqual({
      rooms: { data: [{ type: "room", id: "10" }] },
    });
    expect(included).toEqual(
      expect.arrayContaining([
        {
          type: "room",
          id: "10",
          attributes: { room_type: "bedroom" },
          relationships: { beds: { data: [{ type: "bed", lid: "1" }] } },
        },
        {
          type: "bed",
          lid: "1",
          attributes: { bed_type: "beds_double" },
        },
      ]),
    );
  });

  it("sends a resource only once in included when it is repeated", () => {
    const { included } = JsonAPISerializer.toJsonAPI(
      RentalUnit.build({
        rooms: [
          Room.build({ id: "10", beds: [Bed.build({ id: "7" })] }),
          Room.build({ id: "11", beds: [Bed.build({ id: "7" })] }),
        ],
      }),
    );

    expect(
      included?.filter((resource) => resource.type === "bed"),
    ).toHaveLength(1);
  });
});
