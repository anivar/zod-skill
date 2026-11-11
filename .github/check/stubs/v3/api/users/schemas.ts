// Stands in for the module that v3/rules/arch-schema-organization.md shows as api/users/schemas.ts.
// Under stubs/v3/, `zod` resolves to the Zod 3 alias, as it does for the blocks that import this file.
import * as z from "zod";

export const CreateUserBody = z.object({ name: z.string().min(1), email: z.string().email() });
export const UserResponse = z.object({ id: z.string(), name: z.string(), email: z.string().email() });
