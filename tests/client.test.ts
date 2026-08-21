import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonAPIClient } from "../src/client.js";
import { JsonAPIResourceSchema } from "../src/schema.js";

const Person = JsonAPIResourceSchema.extend({ full_name: z.string() });
const Movie = JsonAPIResourceSchema.extend({
  title: z.string(),
  year: z.number(),
  director: Person,
});
const Series = JsonAPIResourceSchema.extend({
  title: z.string(),
  seasons: z.number(),
});

function readFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
      "utf-8",
    ),
  );
}

function mockFetchOnce(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

describe("JsonAPIClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gets a list of resources with included relationships", async () => {
    mockFetchOnce(readFixture("movies.json"));
    const client = new JsonAPIClient("http://example.com/api/movies", Movie);

    const [result, meta] = await client.get();

    expect(Array.isArray(result)).toBe(true);
    const movies = result as z.infer<typeof Movie>[];
    expect(movies).toHaveLength(2);
    expect(meta.total).toBe(2);
    expect(movies[0]?.title).toBe(
      "Das weiße Band - Eine deutsche Kindergeschichte",
    );
    expect(movies[0]?.year).toBe(2009);
    expect(movies[0]?.director.full_name).toBe("Michael Haneke");
    expect(movies[1]?.title).toBe("Funny Games");
    expect(movies[1]?.director.full_name).toBe("Michael Haneke");
  });

  it("gets a polymorphic list of resources", async () => {
    mockFetchOnce(readFixture("media.json"));
    const client = new JsonAPIClient(
      "http://example.com/api/media",
      z.union([Movie, Series]),
    );

    const [result, meta] = await client.get();

    const media = result as (z.infer<typeof Movie> | z.infer<typeof Series>)[];
    expect(media).toHaveLength(2);
    expect(meta.total).toBe(2);
    expect("director" in media[0]).toBe(true);
    expect("seasons" in media[1]).toBe(true);
  });

  it("gets a single resource with an empty meta when absent", async () => {
    mockFetchOnce(readFixture("movie.json"));
    const client = new JsonAPIClient("http://example.com/api/movies/2", Movie);

    const [result, meta] = await client.get();

    const movie = result as z.infer<typeof Movie>;
    expect(meta).toEqual({});
    expect(movie.title).toBe("Funny Games");
    expect(movie.year).toBe(1997);
    expect(movie.director.full_name).toBe("Michael Haneke");
  });

  it("gets a date attribute as a Date instance", async () => {
    const MovieWithReleaseDate = JsonAPIResourceSchema.extend({
      title: z.string(),
      released_at: z.coerce.date(),
    });
    mockFetchOnce({
      data: {
        id: "3",
        type: "movie",
        attributes: {
          title: "Jurassic Park",
          released_at: "1993-06-11T00:00:00.000Z",
        },
      },
    });
    const client = new JsonAPIClient(
      "http://example.com/api/movies/3",
      MovieWithReleaseDate,
    );

    const [movie] = await client.get();

    const releasedAt = (movie as z.infer<typeof MovieWithReleaseDate>)
      .released_at;
    expect(releasedAt).toBeInstanceOf(Date);
    expect(releasedAt.toISOString()).toBe("1993-06-11T00:00:00.000Z");
  });

  it("serializes a date attribute to an ISO string in the request body", async () => {
    const MovieWithReleaseDate = JsonAPIResourceSchema.extend({
      title: z.string(),
      released_at: z.coerce.date(),
    });
    mockFetchOnce({
      data: {
        id: "3",
        type: "movie",
        attributes: {
          title: "Jurassic Park",
          released_at: "1993-06-11T00:00:00.000Z",
        },
      },
    });
    const client = new JsonAPIClient(
      "http://example.com/api/movies/3",
      MovieWithReleaseDate,
    );

    await client.put({
      data: {
        attributes: { released_at: new Date("1993-06-11T00:00:00.000Z") },
      },
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      data: { attributes: { released_at: "1993-06-11T00:00:00.000Z" } },
    });
  });
});
