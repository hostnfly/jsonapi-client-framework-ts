import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonAPIClient } from "../src/client.js";
import { JsonAPIResource } from "../src/resource.js";
import { JsonAPIResourceSchema } from "../src/schema.js";

const Movie = JsonAPIResourceSchema.extend({
  title: z.string(),
  year: z.number(),
});

function mockFetchOnce(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(status === 204 ? null : JSON.stringify(body), { status }),
      ),
  );
}

describe("JsonAPIResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gets the resource", async () => {
    mockFetchOnce({
      data: {
        id: "179",
        type: "movie",
        attributes: { title: "Jurassic Park", year: 1993 },
      },
    });
    const resource = new JsonAPIResource(
      new JsonAPIClient("http://example.com/api/movies/179", Movie),
    );

    const movie = await resource.get();

    expect(movie.title).toBe("Jurassic Park");
    expect(movie.year).toBe(1993);
  });

  it("updates the resource", async () => {
    mockFetchOnce({
      data: {
        id: "179",
        type: "movie",
        attributes: { title: "Jurassic Park", year: 1993 },
      },
    });
    const resource = new JsonAPIResource(
      new JsonAPIClient("http://example.com/api/movies/179", Movie),
    );

    const movie = await resource.update({ year: 1993 });

    expect(movie.year).toBe(1993);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({
      data: { attributes: { year: 1993 } },
    });
  });

  it("deletes the resource", async () => {
    mockFetchOnce(null, 204);
    const resource = new JsonAPIResource(
      new JsonAPIClient("http://example.com/api/movies/179", Movie),
    );

    await resource.delete();

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});
