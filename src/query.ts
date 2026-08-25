export type JsonAPIFilterValue =
  string | number | boolean | Date | string[] | Date[];
export type JsonAPISortValue = string | string[];
export type JsonAPIIncludeValue = string | string[];

export interface JsonAPIQueryOptions {
  filters?: Record<string, JsonAPIFilterValue>;
  page?: Record<string, number>;
  sort?: JsonAPISortValue;
  include?: JsonAPIIncludeValue;
}

function toQueryParamValue(
  value: JsonAPIFilterValue | JsonAPISortValue,
): string {
  if (Array.isArray(value)) {
    return value.map((item) => toQueryParamValue(item)).join(",");
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function filterParams(
  filters: Record<string, JsonAPIFilterValue> | undefined,
): Record<string, string> {
  if (filters === undefined) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      `filter[${key}]`,
      toQueryParamValue(value),
    ]),
  );
}

function sortParams(
  sort: JsonAPISortValue | undefined,
): Record<string, string> {
  return sort === undefined ? {} : { sort: toQueryParamValue(sort) };
}

function pageParams(
  page: Record<string, number> | undefined,
): Record<string, string> {
  if (page === undefined) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(page).map(([key, value]) => [`page[${key}]`, String(value)]),
  );
}

function includeParams(
  include: JsonAPIIncludeValue | undefined,
): Record<string, string> {
  return include === undefined ? {} : { include: toQueryParamValue(include) };
}

export const JsonAPIQuery = {
  toRequestParams(options: JsonAPIQueryOptions): Record<string, string> {
    return {
      ...filterParams(options.filters),
      ...sortParams(options.sort),
      ...pageParams(options.page),
      ...includeParams(options.include),
    };
  },
};
