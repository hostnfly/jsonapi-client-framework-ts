import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonAPIClient } from "../src/client.js";
import { JsonAPIResourcesList } from "../src/resourcesList.js";
import { JsonAPIResourceSchema } from "../src/schema.js";

const Movie = JsonAPIResourceSchema.extend({ title: z.string() });

function movie(id: string, title: string): unknown {
  return { id, type: "movie", attributes: { title } };
}

function mockFetchSequence(...bodies: unknown[]): void {
  const fetchMock = vi.fn();
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status: 200 }),
    );
  }
  vi.stubGlobal("fetch", fetchMock);
}

describe("JsonAPIResourcesList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a single page with paginated()", async () => {
    mockFetchSequence({
      data: [movie("1", "Jurassic Park")],
      meta: { total: 1, pagination: {} },
    });
    const list = new JsonAPIResourcesList(
      new JsonAPIClient("http://example.com/api/movies", Movie),
    );

    const [movies, meta] = await list.paginated(1, 10);

    expect(movies).toEqual([{ id: "1", title: "Jurassic Park" }]);
    expect(meta.total).toBe(1);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(
      "http://example.com/api/movies?page%5Bnumber%5D=1&page%5Bsize%5D=10",
    );
  });

  it("falls back to defaultPageSize when no size is given", async () => {
    mockFetchSequence({ data: [], meta: { pagination: {} } });
    const list = new JsonAPIResourcesList(
      new JsonAPIClient("http://example.com/api/movies", Movie),
      { defaultPageSize: 50 },
    );

    await list.paginated(1);

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("page%5Bsize%5D=50");
  });

  it("passes filters, sort and include through to every page request", async () => {
    mockFetchSequence({ data: [], meta: { pagination: {} } });
    const list = new JsonAPIResourcesList(
      new JsonAPIClient("http://example.com/api/movies", Movie),
      { filters: { year: 1993 }, sort: "title", include: "director" },
    );

    await list.paginated(1);

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(String(url)).searchParams;
    expect(params.get("filter[year]")).toBe("1993");
    expect(params.get("sort")).toBe("title");
    expect(params.get("include")).toBe("director");
  });

  it("walks every page until meta.pagination.next is absent, via all()", async () => {
    mockFetchSequence(
      {
        data: [movie("1", "Jurassic Park")],
        meta: { pagination: { next: 2 } },
      },
      {
        data: [movie("2", "The Lost World")],
        meta: { pagination: {} },
      },
    );
    const list = new JsonAPIResourcesList(
      new JsonAPIClient("http://example.com/api/movies", Movie),
    );

    const movies = await list.all();

    expect(movies).toEqual([
      { id: "1", title: "Jurassic Park" },
      { id: "2", title: "The Lost World" },
    ]);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
    const [firstUrl] = vi.mocked(fetch).mock.calls[0];
    const [secondUrl] = vi.mocked(fetch).mock.calls[1];
    expect(String(firstUrl)).toContain("page%5Bnumber%5D=1");
    expect(String(secondUrl)).toContain("page%5Bnumber%5D=2");
  });

  it("stops fetching further pages once the consumer breaks out of pages()", async () => {
    mockFetchSequence(
      {
        data: [movie("1", "Jurassic Park")],
        meta: { pagination: { next: 2 } },
      },
      {
        data: [movie("2", "The Lost World")],
        meta: { pagination: { next: 3 } },
      },
      {
        data: [movie("3", "Jurassic Park III")],
        meta: { pagination: {} },
      },
    );
    const list = new JsonAPIResourcesList(
      new JsonAPIClient("http://example.com/api/movies", Movie),
    );

    const seen: unknown[] = [];
    for await (const resources of list.pages()) {
      seen.push(...resources);
      break;
    }

    expect(seen).toEqual([{ id: "1", title: "Jurassic Park" }]);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });
});
