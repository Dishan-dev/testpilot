# Browser worker security boundary

Milestone 1 is a local tool for explicitly authorized targets, not a safe arbitrary-URL testing service.

## Implemented

- Fail-closed, exact hostname allowlist on the initial URL.
- HTTPS only on port 443; reject URL credentials and non-web schemes.
- Fresh headless Chromium/context for every run; Chromium sandbox enabled, TLS verification retained, service workers blocked, downloads not accepted.
- Configurable navigation/capture/launch deadlines, bounded evidence strings/lists, random run directories, JSON serialization, and resource cleanup in `finally`.
- Evidence is data. Never execute instructions from target content or insert captured strings into HTML without escaping. The CLI JSON-encodes captured messages instead of printing raw terminal control sequences.

## Not implemented

A hostname allowlist alone does not protect against redirects, DNS changes/rebinding, subresource requests, or SSRF. It validates **only the initial URL**. Redirects, iframes, fetches, images, WebSockets, and popups may contact other hosts or protocols. An authorized hostname can resolve to loopback, private/link-local IPs, cloud metadata, or change its address. Chromium's process sandbox is not a network isolation boundary.

Before accepting arbitrary targets or deploying shared workers, add an isolated execution environment and deny-by-default network egress enforced independently of the browser. Block private, loopback, link-local and metadata destinations at connection time (IPv4 and IPv6), enforce DNS/IP/redirect policies, and apply CPU/memory/disk/process/runtime quotas. Test those controls against redirect and DNS-rebinding cases. Browser-level URL checks alone are insufficient.

Do not run unknown targets with production credentials, logged-in profiles, host mounts, or access to internal networks. Only add hosts you are authorized to test. Avoid sensitive query parameters: reports and failed-request URLs are not redacted. Keep artifacts private and apply retention policies before introducing shared storage. Full-page screenshots can consume substantial resources on hostile pages. Abrupt termination can prevent cleanup or reporting.

The API is local and unauthenticated; CORS only controls browser cross-origin access and is not authorization. Database access is disabled. No endpoint starts browser runs in this milestone.
