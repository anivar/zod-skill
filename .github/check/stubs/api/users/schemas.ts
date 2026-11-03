// Stands in for the module that rules/arch-schema-organization.md shows as api/users/schemas.ts.
import * as z from "zod";

export const CreateUserBody = z.object({ name: z.string().min(1), email: z.email() });
export const UserResponse = z.object({ id: z.string(), name: z.string(), email: z.email() });
