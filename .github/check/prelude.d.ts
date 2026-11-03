/// <reference types="vitest/globals" />
// Application objects the examples use without declaring them. Each one has a real type; none is `any`.
// A schema an example depends on is declared in the example, because its shape is part of what the example shows.
declare global {
  /** Untrusted input as it arrives at a boundary. */
  const data: unknown;
  const input: unknown;
  /** An Express application. */
  const app: import("express").Express;
  /** A database client. */
  const db: {
    exists(value: string): Promise<boolean>;
    query(sql: string, params?: unknown[]): Promise<unknown>;
    users: { exists(email: string): Promise<boolean>; create(user: unknown): Promise<{ id: string }> };
    posts: { create(post: unknown): Promise<{ id: string }> };
  };
  /** A structured logger. */
  const logger: {
    info(message: unknown, fields?: Record<string, unknown>): void;
    warn(message: unknown, fields?: Record<string, unknown>): void;
    error(message: unknown, fields?: Record<string, unknown>): void;
  };
  /** A metrics client. */
  const metrics: { increment(name: string, tags?: Record<string, string>): void };
}
export {};
