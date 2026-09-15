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

abstract class JsonAPIBaseResource<T> {
  abstract readonly endpoint: string;
  abstract readonly schema: z.ZodType<T>;

  constructor(
    protected readonly baseUrl: string,
    protected readonly auth?: JsonAPIAuth,
    protected readonly include?: JsonAPIIncludeValue,
  ) {}

  protected get client(): JsonAPIClient<T> {
    return new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}`,
      this.schema,
      this.auth,
    );
  }

  async create(attributes: Record<string, JsonAPISerializerValue>): Promise<T> {
    const payload = JsonAPISerializer.toJsonAPI(attributes);
    const params = JsonAPIQuery.toRequestParams({ include: this.include });
    const [resource] = await this.client.post(payload, params);
    return resource;
  }
}

export abstract class JsonAPISingleton<T> extends JsonAPIBaseResource<T> {
  resource(): JsonAPIResource<T> {
    return new JsonAPIResource<T>(this.client, this.include);
  }
}

export interface JsonAPIListOptions {
  filters?: Record<string, JsonAPIFilterValue>;
  sort?: JsonAPISortValue;
  extraParams?: Record<string, string>;
}

export abstract class JsonAPICollection<T> extends JsonAPIBaseResource<T> {
  constructor(
    baseUrl: string,
    auth?: JsonAPIAuth,
    protected readonly defaultPageSize?: number,
    include?: JsonAPIIncludeValue,
  ) {
    super(baseUrl, auth, include);
  }

  resource(resourceId: string): JsonAPIResource<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}/${encodeURIComponent(resourceId)}`,
      this.schema,
      this.auth,
    );
    return new JsonAPIResource<T>(client, this.include);
  }

  list(options: JsonAPIListOptions = {}): JsonAPIResourcesList<T> {
    return new JsonAPIResourcesList<T>(this.client, {
      defaultPageSize: this.defaultPageSize,
      filters: options.filters,
      sort: options.sort,
      include: this.include,
      extraParams: options.extraParams,
    });
  }
}
