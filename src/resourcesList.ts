import type { JsonAPIClient } from "./client.js";
import {
  JsonAPIQuery,
  type JsonAPIFilterValue,
  type JsonAPIIncludeValue,
  type JsonAPISortValue,
} from "./query.js";

export interface JsonAPIResourcesListOptions {
  defaultPageSize?: number;
  filters?: Record<string, JsonAPIFilterValue>;
  sort?: JsonAPISortValue;
  include?: JsonAPIIncludeValue;
  extraParams?: Record<string, string>;
}

function nextPage(meta: Record<string, unknown>): number | undefined {
  const pagination = meta.pagination as { next?: number };
  return pagination.next;
}

export class JsonAPIResourcesList<T> {
  private readonly defaultPageSize?: number;
  private readonly filters?: Record<string, JsonAPIFilterValue>;
  private readonly sort?: JsonAPISortValue;
  private readonly include?: JsonAPIIncludeValue;
  private readonly extraParams: Record<string, string>;

  constructor(
    private readonly client: JsonAPIClient<T>,
    options: JsonAPIResourcesListOptions = {},
  ) {
    this.defaultPageSize = options.defaultPageSize;
    this.filters = options.filters;
    this.sort = options.sort;
    this.include = options.include;
    this.extraParams = options.extraParams ?? {};
  }

  async all(): Promise<T[]> {
    const results: T[] = [];

    for await (const resources of this.pages()) {
      results.push(...resources);
    }

    return results;
  }

  async *pages(): AsyncGenerator<T[]> {
    let page: number | undefined = 1;

    while (page !== undefined) {
      const [resources, meta] = await this.paginated(page);
      yield resources;
      page = nextPage(meta);
    }
  }

  async paginated(
    page?: number,
    size?: number,
  ): Promise<[T[], Record<string, unknown>]> {
    const jsonapiPage: Record<string, number> = {};
    if (page !== undefined) {
      jsonapiPage.number = page;
    }
    const effectiveSize = size ?? this.defaultPageSize;
    if (effectiveSize !== undefined) {
      jsonapiPage.size = effectiveSize;
    }

    const params = JsonAPIQuery.toRequestParams({
      filters: this.filters,
      sort: this.sort,
      page: jsonapiPage,
      include: this.include,
    });
    const [results, meta] = await this.client.get({
      ...params,
      ...this.extraParams,
    });
    return [results as T[], meta];
  }
}
