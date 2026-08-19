import { z } from "zod";

export const JsonAPIResourceSchema = z.object({
  id: z.string(),
});
export type JsonAPIResourceSchema = z.infer<typeof JsonAPIResourceSchema>;

export const JsonAPIResourceIdentifier = z.object({
  id: z.string(),
  type: z.string(),
});
export type JsonAPIResourceIdentifier = z.infer<
  typeof JsonAPIResourceIdentifier
>;

export const JsonAPIError = z.object({
  status: z.string(),
  detail: z.string(),
  code: z.string(),
});
export type JsonAPIError = z.infer<typeof JsonAPIError>;
