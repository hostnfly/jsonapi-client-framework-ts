import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonAPIClient } from "../src/client.js";
import { JsonAPICollection } from "../src/collection.js";
import { JsonAPIResource } from "../src/resource.js";
import { JsonAPIResourceSchema } from "../src/schema.js";

const Movie = JsonAPIResourceSchema.extend({ title: z.string() });
const Theater = JsonAPIResourceSchema.extend({ name: z.string() });
const Character = JsonAPIResourceSchema.extend({ name: z.string() });

class Theaters extends JsonAPICollection<z.infer<typeof Theater>> {
  readonly endpoint = "/theaters";
  readonly schema = Theater;
}

class Characters extends JsonAPICollection<z.infer<typeof Character>> {
  readonly endpoint = "/characters";
  readonly schema = Character;
}

class MovieResource extends JsonAPIResource<z.infer<typeof Movie>> {
  characters(): Characters {
    return new Characters(this.url, this.auth);
  }
}

class Movies extends JsonAPICollection<z.infer<typeof Movie>> {
  readonly endpoint = "/movies";
  readonly schema = Movie;

  theaters(): Theaters {
    return new Theaters(`${this.baseUrl}${this.endpoint}`, this.auth);
  }

  override resource(resourceId: string): MovieResource {
    const client = new JsonAPIClient<z.infer<typeof Movie>>(
      `${this.baseUrl}${this.endpoint}/${encodeURIComponent(resourceId)}`,
      this.schema,
      this.auth,
    );
    return new MovieResource(client, this.include);
  }
}

function mockFetchOnce(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
  );
}

describe("Sub-collections", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scopes a nested collection under the parent collection's endpoint", async () => {
    mockFetchOnce({
      data: [
        { id: "1", type: "theater", attributes: { name: "Le Grand Rex" } },
      ],
      meta: { pagination: {} },
    });
    const movies = new Movies("http://example.com/api");

    const theaters = await movies.theaters().list().all();

    expect(theaters).toEqual([{ id: "1", name: "Le Grand Rex" }]);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(
      "http://example.com/api/movies/theaters?page%5Bnumber%5D=1",
    );
  });
});

describe("Sub-resources", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scopes a nested collection under a specific resource's URL", async () => {
    mockFetchOnce({
      data: [
        { id: "2", type: "character", attributes: { name: "Ellie Sattler" } },
      ],
      meta: { pagination: {} },
    });
    const movies = new Movies("http://example.com/api");

    const characters = await movies.resource("34").characters().list().all();

    expect(characters).toEqual([{ id: "2", name: "Ellie Sattler" }]);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(
      "http://example.com/api/movies/34/characters?page%5Bnumber%5D=1",
    );
  });
});
