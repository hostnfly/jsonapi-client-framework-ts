import type { JsonAPIAuth, JsonAPIClient } from "./client.js";
import { JsonAPIQuery, type JsonAPIIncludeValue } from "./query.js";
import {
  JsonAPISerializer,
  type JsonAPISerializerValue,
} from "./serializer.js";

export class JsonAPIResource<T> {
  constructor(
    private readonly client: JsonAPIClient<T>,
    private readonly include?: JsonAPIIncludeValue,
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

  async update(attributes: Record<string, JsonAPISerializerValue>): Promise<T> {
    const payload = JsonAPISerializer.toJsonAPI(attributes);
    const params = JsonAPIQuery.toRequestParams({ include: this.include });
    const [resource] = await this.client.put(payload, params);
    return resource;
  }

  async delete(): Promise<void> {
    await this.client.delete();
  }
}
