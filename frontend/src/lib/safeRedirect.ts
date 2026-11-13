// Make sure that a redirect destination is safe
export function safeRedirect(path: string | undefined) {
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
}
