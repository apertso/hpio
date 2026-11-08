import { z } from "zod";
import { builtinIcons, type BuiltinIcon } from "./builtinIcons";

export const paymentChangesSchema = z.object({
  title: z.string(),
  amount: z.coerce.number().finite(),
  dueDate: z.string(),
  remind: z.boolean(),
  builtinIconName: z.custom<BuiltinIcon>(
    (value) => builtinIcons.some((icon) => icon === value)
  ).nullable(),
  seriesId: z.string().nullable(),
  completedAt: z.string().nullable(),
  method: z.enum(["cash", "card", "transfer", "other"]),
}).partial().passthrough();

export const fileUploadResponseSchema = z.object({
  file: z.object({ fileName: z.string(), filePath: z.string().nullish() }),
});
