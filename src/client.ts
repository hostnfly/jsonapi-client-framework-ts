import type { z } from "zod";

import {
  JsonAPIError,
  type JsonAPIError as JsonAPIErrorType,
} from "./schema.js";
import { JsonAPIParser, type JsonAPIResourceObject } from "./parser.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const HTTP_422_UNPROCESSABLE_ENTITY = 422;

export interface JsonAPIAuth {
  headers(): Record<string, string>;
}

export class APIError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly jsonapiErrors: JsonAPIErrorType[],
  ) {
    super(`API responded with status code ${statusCode}`);
    this.name = "APIError";
  }
}

interface JsonAPIDocument {
  data: JsonAPIResourceObject | JsonAPIResourceObject[];
  included?: JsonAPIResourceObject[];
  meta?: Record<string, unknown>;
}

async function handleStatusCode(response: Response): Promise<void> {
  if (response.status === HTTP_422_UNPROCESSABLE_ENTITY) {
    const body = (await response.json()) as { errors: unknown[] };
    const jsonapiErrors = body.errors.map((error) => JsonAPIError.parse(error));
    throw new APIError(response.status, jsonapiErrors);
  }

  if (!response.ok) {
    throw new Error(`Request failed with status code ${response.status}`);
  }
}

export class JsonAPIClient<T> {
  constructor(
    private readonly url: string,
    private readonly schema: z.ZodType<T>,
    private readonly auth?: JsonAPIAuth,
  ) {}

  async get(
    params?: Record<string, string>,
  ): Promise<[T | T[], Record<string, unknown>]> {
    const response = await this.performRequest("GET", params);
    return this.deserializePayload(response);
  }

  async post(
    payload: Record<string, unknown>,
    params?: Record<string, string>,
  ): Promise<[T, Record<string, unknown>]> {
    const response = await this.performRequest("POST", params, payload);
    const [resource, meta] = await this.deserializePayload(response);
    return [resource as T, meta];
  }

  async put(
    payload: Record<string, unknown>,
    params?: Record<string, string>,
  ): Promise<[T, Record<string, unknown>]> {
    const response = await this.performRequest("PUT", params, payload);
    const [resource, meta] = await this.deserializePayload(response);
    return [resource as T, meta];
  }

  async delete(): Promise<void> {
    await this.performRequest("DELETE");
  }

  private async performRequest(
    method: string,
    params?: Record<string, string>,
    payload?: Record<string, unknown>,
  ): Promise<Response> {
    const url = new URL(this.url);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...this.auth?.headers(),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    await handleStatusCode(response);
    return response;
  }

  private async deserializePayload(
    response: Response,
  ): Promise<[T | T[], Record<string, unknown>]> {
    const {
      data,
      included,
      meta = {},
    } = (await response.json()) as JsonAPIDocument;

    if (Array.isArray(data)) {
      const parsed = JsonAPIParser.parse({ data, included });
      return [parsed.map((resource) => this.schema.parse(resource)), meta];
    }

    const parsed = JsonAPIParser.parse({ data, included });
    return [this.schema.parse(parsed), meta];
  }
}
