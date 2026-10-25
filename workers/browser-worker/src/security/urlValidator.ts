export class UrlValidationError extends Error {
  override name = "UrlValidationError";
}

export function parseAuthorizedHosts(value: string | undefined): ReadonlySet<string> {
  const hosts = new Set<string>();
  for (const entry of (value ?? "").split(",")) {
    const host = entry.trim().toLowerCase();
    if (!host) continue;
    // Configuration is a list of exact hostnames, never URLs, ports or wildcards.
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) || host.includes("..")) {
      throw new UrlValidationError("AUTHORIZED_HOSTS must contain exact hostnames without ports, wildcards or trailing dots.");
    }
    hosts.add(host);
  }
  return hosts;
}

export function validateUrl(input: string, authorizedHosts: ReadonlySet<string>): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UrlValidationError("Provide a valid absolute HTTPS URL.");
  }
  if (url.protocol !== "https:") throw new UrlValidationError("Only HTTPS URLs are supported.");
  if (url.username || url.password) throw new UrlValidationError("URLs containing credentials are not allowed.");
  if (url.port && url.port !== "443") throw new UrlValidationError("Only the default HTTPS port (443) is supported.");
  if (!authorizedHosts.has(url.hostname.toLowerCase())) {
    throw new UrlValidationError("Target hostname is not in AUTHORIZED_HOSTS. Explicit authorization is required.");
  }
  return url;
}
