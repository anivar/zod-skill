// Packages that examples import but the check does not install. Each declaration copies the
// signature the examples use from the package's own documentation; none is `any`.

declare module "next/cache" {
  export function revalidatePath(path: string, type?: "layout" | "page"): void;
}

declare module "madge" {
  interface MadgeResult {
    circular(): string[][];
    obj(): Record<string, string[]>;
  }
  interface MadgeConfig {
    fileExtensions?: string[];
    tsConfig?: string;
    excludeRegExp?: RegExp[];
  }
  function madge(path: string | string[], config?: MadgeConfig): Promise<MadgeResult>;
  export default madge;
}
