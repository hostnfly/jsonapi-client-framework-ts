import type { JsonAPIClient } from "./client.js";
import {
  JsonAPISerializer,
  type JsonAPISerializerValue,
} from "./serializer.js";

export class JsonAPIResource<T> {
  constructor(private readonly client: JsonAPIClient<T>) {}

  async get(): Promise<T> {
    const [resource] = await this.client.get();
    return resource as T;
  }

  async update(attributes: Record<string, JsonAPISerializerValue>): Promise<T> {
    const payload = JsonAPISerializer.toJsonAPI(attributes);
    const [resource] = await this.client.put(payload);
    return resource;
  }

  async delete(): Promise<void> {
    await this.client.delete();
  }
}
