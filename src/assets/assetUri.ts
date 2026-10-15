/**
 * Metro's `require()` of a static asset returns `{ uri, width, height }` on web
 * and a numeric asset id on native. Code that needs a URL uses this instead of
 * casting the result to string, which hides the object from the type checker.
 *
 * @returns the string itself, the `uri` of a web asset object, or undefined.
 */
export function assetUri(source: unknown): string | undefined {
  if (typeof source === 'string') {
    return source;
  }
  if (typeof source === 'object' && source !== null) {
    const uri = (source as { uri?: unknown }).uri;
    return typeof uri === 'string' ? uri : undefined;
  }
  return undefined;
}
