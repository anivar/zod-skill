// Stands in for an application module that the examples import. Shape matches the examples that use it.
import * as z from "zod";

export const UserSchema = z.object({ name: z.string(), email: z.email(), age: z.int().min(0) });
export const OrderSchema = z.object({ id: z.string(), total: z.number().nonnegative() });
