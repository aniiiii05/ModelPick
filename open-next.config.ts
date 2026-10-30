import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: the only page is static (served from assets) and /api/recommend is dynamic.
// To enable ISR / fetch caching later, add an R2 bucket and use the r2-incremental-cache override.
export default defineCloudflareConfig({});
