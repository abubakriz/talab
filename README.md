# Talab

Talab is an HTTP client for JavaScript and TypeScript. It uses results-based error handling, eliminating the need for `try/catch` blocks 
around requests.

<sub>Fun Fact: "Talab" (طلب) is an Arabic word for "request"<sub>

## Features

- **No `try/catch` blocks:** Network failures and HTTP status codes are returned as values.
- **Linear control flow:** Reduces nesting and keeps your business logic flat.
- **Type-safe:** Strong TypeScript inference directly on the response object.
- **Zero dependencies:** A lightweight wrapper around native `fetch`.
- **Tiny footprint:** ~1kb gzipped.
- **Middleware support:** Intercept and modify requests and responses.
- **Addon support:** Extend the `TalabInstance` API with custom fluent methods.
- **Resolver addons:** Extend the resolver (response handler) with custom parsing methods.

## Why Talab?

Standard HTTP clients throw exceptions for network errors and non-2xx status codes. However, network failures, timeouts, and 4xx/5xx responses are common, expected occurrences in web applications. It does not make sense to use exceptions for expected control flow. This approach forces developers to rely on nested `try/catch` blocks and repetitive type-guards.

Talab treats network behavior as data. It catches network failures, timeouts, and parse errors, returning them as a typed error value. Additionally, 4xx/5xx HTTP responses are treated as successful network requests rather than errors. This guarantees that your business logic is handled linearly and exceptions are reserved strictly for actual runtime bugs.

## Comparison

### Using Axios (Exception-based)

```ts
import axios from "axios";

async function getPost(id: number) {
  try {
    const res = await axios.get(`https://api.example.com/posts/${id}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return null; // Handle status codes
      }
      return null; // Handle network errors
    }
    throw error;
  }
}
```

### Using Talab (Results-based)

```ts
import { talab } from "@abubakriz/talab";

async function getPost(id: number) {
  const res = await talab
    .get(`https://api.example.com/posts/${id}`)
    .json<Post>();

  if (!res.ok) {
    return null; // Handle network errors
  }

  if (res.status === 404) {
    return null; // Handle status codes
  }

  return res.data;
}
```

## Advanced Features

### Instances and Configuration

You can create instances with default configurations that merge intelligently:

```ts
const api = talab.create({
  base: "https://api.example.com",
  headers: { "X-App-Version": "1.0.0" }
});

// Inherits base URL and headers from `api`
const authed = api.create({
  headers: { Authorization: "Bearer token" }
});
```

### Middlewares

Middlewares allow you to intercept and modify requests and responses.

```ts
import type { Middleware } from "@abubakriz/talab";

const addHeader: Middleware = (next) => (url, init) => {
  const headers = new Headers(init.headers);
  headers.set("X-Timing", Date.now().toString());
  return next(url, { ...init, headers });
};

const api = talab.create({ middlewares: [addHeader] });
```

### Addons

Extend the `TalabInstance` API with custom fluent methods.

```ts
import type { Addon, TalabInstance } from "@abubakriz/talab";

type BearerAddon = Addon<{ bearer(token: string): TalabInstance }>;

const bearerAddon: BearerAddon = (instance) => ({
  ...instance,
  bearer(token: string) {
    return instance.create({
      headers: { Authorization: `Bearer ${token}` },
    });
  },
});

const api = talab.create().addon(bearerAddon);

await api.bearer("my-token").get("/protected").json();
```

### Resolver Addons

Resolver addons extend the resolver object (the response handler returned by `.get()`, `.post()`, etc.) with custom parsing methods. While addons extend the *instance*, resolver addons extend the *resolver*.

```ts
import type { ResolverAddon } from "@abubakriz/talab";

// Add a custom `.jsonStrict()` that treats non-2xx as errors
const strictResolver: ResolverAddon<{
  jsonStrict<T>(): Promise<Result<T>>;
}> = (resolver) => ({
  ...resolver,
  async jsonStrict<T>() {
    const raw = await resolver.raw();
    if (!raw.ok) return raw;
    if (raw.status >= 400) {
      return {
        ok: false as const,
        error: { type: "network" as const, original: new Error(`HTTP ${raw.status}`) },
      };
    }
    const data = (await raw.data.json()) as T;
    return { ok: true as const, data, response: raw.data, status: raw.status };
  },
});

// Apply via .resolver()
const api = talab.create({ base: "https://api.example.com" }).resolver(strictResolver);

// Every request now has .jsonStrict() available
const res = await api.get("/users").jsonStrict<User[]>();
```

Resolver addons compose and inherit through `.create()`, just like middlewares.

### Timeouts and Abort Signals

Talab supports native `AbortSignal` and timeout configurations. You can set a timeout globally on an instance or pass it per-request.

```ts
// Set a 5-second timeout on the instance
const api = talab.create({ timeout: 5000 });

// Override with a 1-second timeout for a specific request
await api.get("/fast", { timeout: 1000 }).json();

// Or use a custom AbortController
const controller = new AbortController();
await api.get("/custom", { signal: controller.signal }).json();
controller.abort();
```

### Custom Fetchers

You can provide a custom `fetch` implementation, which is useful for testing, proxies, or alternate runtimes.

```ts
const api = talab.create({
  fetcher: myCustomFetch
});
```