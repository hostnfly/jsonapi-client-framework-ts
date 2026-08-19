export interface JsonAPIResourceObject {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data: JsonAPIRelationshipData }>;
}

export type JsonAPIRelationshipData =
  { id: string; type: string } | { id: string; type: string }[] | null;

export interface JsonAPIDocument {
  data: JsonAPIResourceObject | JsonAPIResourceObject[];
  included?: JsonAPIResourceObject[];
}

type ParsedByTypeAndId = Record<
  string,
  Record<string, Record<string, unknown>>
>;

function parseRelationship(
  data: JsonAPIRelationshipData,
  included: JsonAPIResourceObject[],
  parsedByTypeAndId: ParsedByTypeAndId,
): unknown {
  if (data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      parseRelationship(item, included, parsedByTypeAndId),
    );
  }

  const cached = parsedByTypeAndId[data.type]?.[data.id];
  if (cached) {
    return cached;
  }

  const includedData = findIncludedData(data, included);
  if (includedData) {
    return parseResource(includedData, included, parsedByTypeAndId);
  }

  return data;
}

function findIncludedData(
  identifier: { id: string; type: string },
  included: JsonAPIResourceObject[],
): JsonAPIResourceObject | undefined {
  return included.find(
    (element) =>
      element.id === identifier.id && element.type === identifier.type,
  );
}

function parseResource(
  data: JsonAPIResourceObject,
  included?: JsonAPIResourceObject[],
  parsedByTypeAndId?: ParsedByTypeAndId,
): Record<string, unknown>;
function parseResource(
  data: JsonAPIResourceObject[],
  included?: JsonAPIResourceObject[],
  parsedByTypeAndId?: ParsedByTypeAndId,
): Record<string, unknown>[];
function parseResource(
  data: JsonAPIResourceObject | JsonAPIResourceObject[],
  included: JsonAPIResourceObject[] = [],
  parsedByTypeAndId: ParsedByTypeAndId = {},
): Record<string, unknown> | Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map((item) => parseResource(item, included, parsedByTypeAndId));
  }

  const parsed: Record<string, unknown> = { id: data.id };
  const parsedByType = (parsedByTypeAndId[data.type] ??= {});
  parsedByType[data.id] = parsed;
  Object.assign(parsed, data.attributes ?? {});

  if (data.relationships) {
    for (const [key, value] of Object.entries(data.relationships)) {
      parsed[key] = parseRelationship(value.data, included, parsedByTypeAndId);
    }
  }

  return parsed;
}

function parse(payload: {
  data: JsonAPIResourceObject;
  included?: JsonAPIResourceObject[];
}): Record<string, unknown>;
function parse(payload: {
  data: JsonAPIResourceObject[];
  included?: JsonAPIResourceObject[];
}): Record<string, unknown>[];
function parse(
  payload: JsonAPIDocument,
): Record<string, unknown> | Record<string, unknown>[] {
  return Array.isArray(payload.data)
    ? parseResource(payload.data, payload.included)
    : parseResource(payload.data, payload.included);
}

export const JsonAPIParser = { parse };
