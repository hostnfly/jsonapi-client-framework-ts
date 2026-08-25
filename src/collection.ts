import type { z } from "zod";

import { type JsonAPIAuth, JsonAPIClient } from "./client.js";
import {
  JsonAPIQuery,
  type JsonAPIFilterValue,
  type JsonAPIIncludeValue,
  type JsonAPISortValue,
} from "./query.js";
import { JsonAPIResource } from "./resource.js";
import { JsonAPIResourcesList } from "./resourcesList.js";
import {
  JsonAPISerializer,
  type JsonAPISerializerValue,
} from "./serializer.js";

export abstract class JsonAPISingleton<T> {
  abstract readonly endpoint: string;
  abstract readonly schema: z.ZodType<T>;

  constructor(
    protected readonly baseUrl: string,
    protected readonly auth?: JsonAPIAuth,
    protected readonly include?: JsonAPIIncludeValue,
  ) {}

  resource(): JsonAPIResource<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}`,
      this.schema,
      this.auth,
    );
    return new JsonAPIResource<T>(client, this.include);
  }
}

export interface JsonAPIListOptions {
  filters?: Record<string, JsonAPIFilterValue>;
  sort?: JsonAPISortValue;
  extraParams?: Record<string, string>;
}

export abstract class JsonAPICollection<T> {
  abstract readonly endpoint: string;
  abstract readonly schema: z.ZodType<T>;

  constructor(
    protected readonly baseUrl: string,
    protected readonly auth?: JsonAPIAuth,
    protected readonly defaultPageSize?: number,
    protected readonly include?: JsonAPIIncludeValue,
  ) {}

  resource(resourceId: string): JsonAPIResource<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}/${encodeURIComponent(resourceId)}`,
      this.schema,
      this.auth,
    );
    return new JsonAPIResource<T>(client, this.include);
  }

  list(options: JsonAPIListOptions = {}): JsonAPIResourcesList<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}`,
      this.schema,
      this.auth,
    );
    return new JsonAPIResourcesList<T>(client, {
      defaultPageSize: this.defaultPageSize,
      filters: options.filters,
      sort: options.sort,
      include: this.include,
      extraParams: options.extraParams,
    });
  }

  async create(attributes: Record<string, JsonAPISerializerValue>): Promise<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}`,
      this.schema,
      this.auth,
    );
    const payload = JsonAPISerializer.toJsonAPI(attributes);
    const params = JsonAPIQuery.toRequestParams({ include: this.include });
    const [resource] = await client.post(payload, params);
    return resource;
  }
}
