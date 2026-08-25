import { describe, expect, it } from "vitest";

import { JsonAPIQuery } from "../src/query.js";

describe("JsonAPIQuery", () => {
  it("returns no params when nothing is provided", () => {
    expect(JsonAPIQuery.toRequestParams({})).toEqual({});
  });

  it("builds filter params", () => {
    const params = JsonAPIQuery.toRequestParams({
      filters: { title: "Jurassic Park", year: 1993, released: true },
    });

    expect(params).toEqual({
      "filter[title]": "Jurassic Park",
      "filter[year]": "1993",
      "filter[released]": "true",
    });
  });

  it("joins array filter values with commas", () => {
    const params = JsonAPIQuery.toRequestParams({
      filters: { genre: ["action", "sci-fi"] },
    });

    expect(params).toEqual({ "filter[genre]": "action,sci-fi" });
  });

  it("serializes date filter values to full ISO8601, without truncating the time", () => {
    const params = JsonAPIQuery.toRequestParams({
      filters: { released_at: new Date("2020-01-02T03:04:05.000Z") },
    });

    expect(params).toEqual({
      "filter[released_at]": "2020-01-02T03:04:05.000Z",
    });
  });

  it("builds a sort param", () => {
    expect(JsonAPIQuery.toRequestParams({ sort: "title" })).toEqual({
      sort: "title",
    });
  });

  it("joins array sort values with commas", () => {
    expect(JsonAPIQuery.toRequestParams({ sort: ["-year", "title"] })).toEqual({
      sort: "-year,title",
    });
  });

  it("builds page params", () => {
    const params = JsonAPIQuery.toRequestParams({
      page: { number: 2, size: 25 },
    });

    expect(params).toEqual({ "page[number]": "2", "page[size]": "25" });
  });

  it("builds an include param", () => {
    expect(JsonAPIQuery.toRequestParams({ include: "director" })).toEqual({
      include: "director",
    });
  });

  it("joins array include values with commas", () => {
    expect(
      JsonAPIQuery.toRequestParams({ include: ["director", "characters"] }),
    ).toEqual({ include: "director,characters" });
  });

  it("combines filters, sort, page and include into a single params object", () => {
    const params = JsonAPIQuery.toRequestParams({
      filters: { year: 1993 },
      sort: "title",
      page: { number: 1 },
      include: "director",
    });

    expect(params).toEqual({
      "filter[year]": "1993",
      sort: "title",
      "page[number]": "1",
      include: "director",
    });
  });
});
