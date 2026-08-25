import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonAPICollection } from "../src/collection.js";
import { JsonAPIResourceSchema } from "../src/schema.js";

const Movie = JsonAPIResourceSchema.extend({ title: z.string() });

class Movies extends JsonAPICollection<z.infer<typeof Movie>> {
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
});
