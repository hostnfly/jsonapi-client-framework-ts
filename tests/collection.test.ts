import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonAPICollection } from "../src/collection.js";
import { JsonAPIResourceSchema } from "../src/schema.js";

const Movie = JsonAPIResourceSchema.extend({ title: z.string() });

class Movies extends JsonAPICollection<z.infer<typeof Movie>> {
  readonly endpoint = "/movies";
  readonly schema = Movie;
}

class MoviesWithDirector extends JsonAPICollection<z.infer<typeof Movie>> {
  readonly endpoint = "/movies";
  readonly schema = Movie;
}

function mockFetchOnce(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

describe("JsonAPICollection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a resource scoped to the collection endpoint", async () => {
    mockFetchOnce({
      data: {
        id: "178",
        type: "movie",
        attributes: { title: "Jurassic Park" },
      },
    });
    const movies = new Movies("http://example.com/api");

    const movie = await movies.resource("178").get();

    expect(movie.title).toBe("Jurassic Park");
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("http://example.com/api/movies/178");
  });

  it("creates a resource", async () => {
    mockFetchOnce({
      data: {
        id: "179",
        type: "movie",
        attributes: { title: "Jurassic Park" },
      },
    });
    const movies = new Movies("http://example.com/api");

    const movie = await movies.create({ title: "Jurassic Park" });

    expect(movie.title).toBe("Jurassic Park");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("http://example.com/api/movies");
    expect(init?.method).toBe("POST");
  });

  it("passes include through to resource()", async () => {
    mockFetchOnce({
      data: {
        id: "178",
        type: "movie",
        attributes: { title: "Jurassic Park" },
      },
    });
    const movies = new MoviesWithDirector(
      "http://example.com/api",
      undefined,
      undefined,
      "director",
    );

    await movies.resource("178").get();

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("include")).toBe("director");
  });

  it("passes include through to create()", async () => {
    mockFetchOnce({
      data: {
        id: "178",
        type: "movie",
        attributes: { title: "Jurassic Park" },
      },
    });
    const movies = new MoviesWithDirector(
      "http://example.com/api",
      undefined,
      undefined,
      "director",
    );

    await movies.create({ title: "Jurassic Park" });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("include")).toBe("director");
  });

  it("builds a JsonAPIResourcesList scoped to the collection endpoint via list()", async () => {
    mockFetchOnce({
      data: [
        { id: "178", type: "movie", attributes: { title: "Jurassic Park" } },
      ],
      meta: { pagination: {} },
    });
    const movies = new Movies("http://example.com/api");

    const result = await movies
      .list({ filters: { year: 1993 }, sort: "title" })
      .all();

    expect(result).toEqual([{ id: "178", title: "Jurassic Park" }]);
    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(String(url)).searchParams;
    expect(params.get("filter[year]")).toBe("1993");
    expect(params.get("sort")).toBe("title");
  });
});
