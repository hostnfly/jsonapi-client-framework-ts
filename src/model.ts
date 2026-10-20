export interface JsonAPIModelClass {
  readonly type: string;
}

const MODEL_MARKER = Symbol.for("jsonapi-client-framework-ts.model");

export abstract class JsonAPIModel {
  static readonly [MODEL_MARKER] = true;

  declare id?: string;

  static build<M extends JsonAPIModel>(
    this: new () => M,
    fields: Partial<M> = {},
  ): M {
    return Object.assign(new this(), fields);
  }
}

export function isJsonAPIModel(value: unknown): value is JsonAPIModel {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const constructor = value.constructor as unknown as Record<symbol, unknown>;
  return constructor[MODEL_MARKER] === true;
}
