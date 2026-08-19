export type JsonAPIAttributeValue = string | number | boolean | Date | null;
export interface JsonAPIRelationshipValue {
  id: string | null;
  type?: string;
}
export type JsonAPISerializerValue =
  | JsonAPIAttributeValue
  | JsonAPIRelationshipValue
  | JsonAPIAttributeValue[]
  | JsonAPIRelationshipValue[];

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

function toJsonAPI(attributes: Record<string, JsonAPISerializerValue>): {
  data: Record<string, unknown>;
} {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    populateValue(data, key, value);
  }
  return { data };
}

export const JsonAPISerializer = { toJsonAPI };
