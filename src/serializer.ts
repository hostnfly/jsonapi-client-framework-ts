import {
  isJsonAPIModel,
  type JsonAPIModel,
  type JsonAPIModelClass,
} from "./model.js";

export type JsonAPIAttributeValue =
  string | number | boolean | Date | null | JsonAPIAttributeObject;
export interface JsonAPIAttributeObject {
  [key: string]: JsonAPIAttributeValue | JsonAPIAttributeValue[] | undefined;
}
export interface JsonAPIRelationshipValue {
  id: string | null;
  type?: string;
}
export type JsonAPISerializerValue =
  | undefined
  | JsonAPIAttributeValue
  | JsonAPIRelationshipValue
  | JsonAPIAttributeValue[]
  | JsonAPIRelationshipValue[];

export interface JsonAPIWriteOptions {
  included?: readonly string[];
}

export interface JsonAPISerializerOptions extends JsonAPIWriteOptions {
  id?: string;
}

interface JsonAPIWriteDocument extends Record<string, unknown> {
  data: Record<string, unknown>;
  included?: Record<string, unknown>[];
}

interface SerializationContext {
  included: Record<string, unknown>[];
  includedKeys: Set<string>;
  nextLid: () => string;
}

type RelatedResource = Record<string, JsonAPISerializerValue>;
type IncludedTree = Map<string, IncludedTree>;

function isRelationshipValue(
  value: unknown,
): value is JsonAPIRelationshipValue {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Date) &&
    "id" in value
  );
}

function populateValue(
  data: Record<string, unknown>,
  key: string,
  value: JsonAPISerializerValue,
): void {
  if (Array.isArray(value)) {
    if (value.length > 0 && isRelationshipValue(value[0])) {
      const relationships = (data.relationships ??= {}) as Record<
        string,
        unknown
      >;
      const relationshipValues = value as JsonAPIRelationshipValue[];
      relationships[key] = {
        data: relationshipValues.filter((item) => item.id !== null),
      };
      return;
    }

    const attributes = (data.attributes ??= {}) as Record<string, unknown>;
    attributes[key] = value;
    return;
  }

  if (isRelationshipValue(value)) {
    const relationships = (data.relationships ??= {}) as Record<
      string,
      unknown
    >;
    relationships[key] = { data: value.id === null ? null : value };
    return;
  }

  const attributes = (data.attributes ??= {}) as Record<string, unknown>;
  attributes[key] = value;
}

function includedTree(paths: readonly string[]): IncludedTree {
  const root: IncludedTree = new Map();
  for (const path of paths) {
    let node = root;
    for (const key of path.split(".")) {
      let child = node.get(key);
      if (child === undefined) {
        child = new Map();
        node.set(key, child);
      }
      node = child;
    }
  }
  return root;
}

function holdsModels(value: unknown): boolean {
  return Array.isArray(value)
    ? value.some((item) => isJsonAPIModel(item))
    : isJsonAPIModel(value);
}

function relatedIdentifier(
  key: string,
  item: unknown,
  included: IncludedTree | undefined,
  context: SerializationContext,
): Record<string, unknown> {
  if (!isJsonAPIModel(item)) {
    throw new TypeError(`Relationship "${key}" expects model instances`);
  }

  const type = modelClass(item).type;
  const { id, ...rest } = item as unknown as RelatedResource;
  const fields = Object.fromEntries(
    Object.entries(rest).filter(([field]) => field !== "type"),
  );
  const hasId = id !== undefined && id !== null;

  if (included === undefined) {
    if (!hasId) {
      throw new TypeError(
        `Relationship "${key}" is not included: every item needs an id`,
      );
    }
    return { type, id: String(id) };
  }

  const identifier = hasId
    ? { type, id: String(id) }
    : { type, lid: context.nextLid() };
  if (hasId) {
    const includedKey = `${type}:${identifier.id}`;
    if (context.includedKeys.has(includedKey)) {
      return identifier;
    }
    context.includedKeys.add(includedKey);
  }

  context.included.push({
    ...identifier,
    attributes: {},
    ...serializeModelFields(fields, included, context),
  });
  return identifier;
}

function serializeRelationship(
  key: string,
  value: JsonAPISerializerValue,
  included: IncludedTree | undefined,
  context: SerializationContext,
): { data: unknown } {
  if (value === null) {
    return { data: null };
  }
  if (Array.isArray(value)) {
    return {
      data: value.map((item) =>
        relatedIdentifier(key, item, included, context),
      ),
    };
  }
  return { data: relatedIdentifier(key, value, included, context) };
}

function serializeModelFields(
  fields: Record<string, JsonAPISerializerValue>,
  included: IncludedTree,
  context: SerializationContext,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    const includedChildren = included.get(key);
    if (includedChildren === undefined && !holdsModels(value)) {
      const attributes = (data.attributes ??= {}) as Record<string, unknown>;
      attributes[key] = value;
      continue;
    }

    const relationships = (data.relationships ??= {}) as Record<
      string,
      unknown
    >;
    relationships[key] = serializeRelationship(
      key,
      value,
      includedChildren,
      context,
    );
  }
  return data;
}

function modelClass(resource: JsonAPIModel): JsonAPIModelClass {
  const model = resource.constructor as unknown as Partial<JsonAPIModelClass>;
  if (typeof model.type !== "string") {
    throw new TypeError(
      `Model ${resource.constructor.name} needs a static type`,
    );
  }
  return model as JsonAPIModelClass;
}

function toJsonAPI(
  resource: Record<string, JsonAPISerializerValue> | JsonAPIModel,
  options: JsonAPISerializerOptions = {},
): JsonAPIWriteDocument {
  if (!isJsonAPIModel(resource)) {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(resource)) {
      if (value !== undefined) {
        populateValue(data, key, value);
      }
    }
    return { data };
  }

  const type = modelClass(resource).type;
  let lastLid = 0;
  const context: SerializationContext = {
    included: [],
    includedKeys: new Set(),
    nextLid: () => String(++lastLid),
  };
  const { id: resourceId, ...rest } = resource as unknown as RelatedResource;
  const fields = Object.fromEntries(
    Object.entries(rest).filter(([key]) => key !== "type"),
  );
  const id = options.id ?? resourceId;
  const data: Record<string, unknown> = { type };
  if (id !== undefined && id !== null) {
    data.id = String(id);
  }
  Object.assign(
    data,
    serializeModelFields(fields, includedTree(options.included ?? []), context),
  );

  return context.included.length > 0
    ? { data, included: context.included }
    : { data };
}

export const JsonAPISerializer = { toJsonAPI };
