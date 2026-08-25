import type { z } from "zod";

import { type JsonAPIAuth, JsonAPIClient } from "./client.js";
import { JsonAPIResource } from "./resource.js";
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
  ) {}

  resource(): JsonAPIResource<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}`,
      this.schema,
      this.auth,
    );
    return new JsonAPIResource<T>(client);
  }
}

export abstract class JsonAPICollection<T> {
  abstract readonly endpoint: string;
  abstract readonly schema: z.ZodType<T>;

  constructor(
    protected readonly baseUrl: string,
    protected readonly auth?: JsonAPIAuth,
  ) {}

  resource(resourceId: string): JsonAPIResource<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}/${encodeURIComponent(resourceId)}`,
      this.schema,
      this.auth,
    );
    return new JsonAPIResource<T>(client);
  }

  async create(attributes: Record<string, JsonAPISerializerValue>): Promise<T> {
    const client = new JsonAPIClient<T>(
      `${this.baseUrl}${this.endpoint}`,
      this.schema,
      this.auth,
    );
    const payload = JsonAPISerializer.toJsonAPI(attributes);
    const [resource] = await client.post(payload);
    return resource;
  }
}
