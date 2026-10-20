import type { JsonAPIAuth, JsonAPIClient } from "./client.js";
import type { JsonAPIModel } from "./model.js";
import { JsonAPIQuery, type JsonAPIIncludeValue } from "./query.js";
import {
  JsonAPISerializer,
  type JsonAPISerializerOptions,
  type JsonAPISerializerValue,
  type JsonAPIWriteOptions,
} from "./serializer.js";

export class JsonAPIResource<T> {
  constructor(
    private readonly client: JsonAPIClient<T>,
    private readonly include?: JsonAPIIncludeValue,
    private readonly writeOptions: JsonAPISerializerOptions = {},
  ) {}

  get url(): string {
    return this.client.url;
  }

  get auth(): JsonAPIAuth | undefined {
    return this.client.auth;
  }

  async get(): Promise<T> {
    const params = JsonAPIQuery.toRequestParams({ include: this.include });
    const [resource] = await this.client.get(params);
    return resource as T;
  }

  async update(
    attributes: Record<string, JsonAPISerializerValue> | JsonAPIModel,
    options: JsonAPIWriteOptions = {},
  ): Promise<T> {
    const payload = JsonAPISerializer.toJsonAPI(attributes, {
      ...options,
      ...this.writeOptions,
    });
    const params = JsonAPIQuery.toRequestParams({ include: this.include });
    const [resource] = await this.client.patch(payload, params);
    return resource;
  }

  async delete(): Promise<void> {
    await this.client.delete();
  }
}
