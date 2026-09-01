import { z } from "zod";

export const claimSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Invalid territory"),
  ownerName: z.string().trim().min(1, "Name is required").max(100),
  companyName: z.string().trim().max(100).optional().default(""),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(160, "Description must be 160 characters or fewer"),
  websiteUrl: z
    .union([
      z
        .string()
        .trim()
        .max(2048)
        .refine(
          (val) => {
            if (val === "") return true;
            try {
              const url = new URL(val);
              return url.protocol === "http:" || url.protocol === "https:";
            } catch {
              return false;
            }
          },
          { message: "Website must be a valid http(s) URL" }
        ),
      z.literal(""),
    ])
    .optional()
    .default(""),
  logoUrl: z.string().trim().max(2048).optional().default(""),
});

export type ClaimInput = z.infer<typeof claimSchema>;

export const adminUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  pricePence: z.number().int().positive().max(100000).optional(),
  colour: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  status: z.enum(["available", "pending", "sold"]).optional(),
  ownerName: z.string().trim().max(100).nullable().optional(),
  companyName: z.string().trim().max(100).nullable().optional(),
  ownerDescription: z.string().trim().max(500).nullable().optional(),
  websiteUrl: z.string().trim().max(2048).nullable().optional(),
  logoUrl: z.string().trim().max(2048).nullable().optional(),
});

export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
