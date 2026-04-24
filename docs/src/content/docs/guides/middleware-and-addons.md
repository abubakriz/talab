---
title: Middleware and Addons
description: Learn how to use middleware and addons to extend the Talab API.
---

## Using Middleware

Middleware allows you to intercept and modify requests before they are sent, or intercept and modify responses before they are returned to the caller.

```ts
import type { Middleware } from "talab";

// A middleware to inject a header
const addHeader: Middleware = (next) => (url, init) => {
  const headers = new Headers(init.headers);
  headers.set("X-Timing", Date.now().toString());
  return next(url, { ...init, headers });
};

// A middleware to wrap the response
const wrapResponse: Middleware = (next) => async (url, init) => {
  const res = await next(url, init);
  const data = await res.json();
  return new Response(JSON.stringify({ wrapped: true, original: data }), {
    status: res.status,
    headers: res.headers,
  });
};

const api = talab.create({ middlewares: [addHeader, wrapResponse] });
```

Child instances inherit middlewares from their parent instances. They execute in the order they are defined.

## Using Addons

You can extend the `TalabInstance` API with custom fluent methods using Addons. This is useful for building domain-specific SDKs.

```ts
import type { Addon, TalabInstance } from "talab";

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

// Use the custom fluent method
await api.bearer("my-token").get("/protected").json();
```
