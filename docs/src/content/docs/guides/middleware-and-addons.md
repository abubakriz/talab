---
title: Middleware, Addons, and Resolver Addons
description: Learn how to use middleware, addons, and resolver addons to extend the Talab API.
---

## Using Middleware

Middleware allows you to intercept and modify requests before they are sent, or intercept and modify responses before they are returned to the caller.

```ts
import type { Middleware } from "@abubakriz/talab";

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

// Use the custom fluent method
await api.bearer("my-token").get("/protected").json();
```

## Using Resolver Addons

While **addons** extend the instance (adding methods like `.bearer()`), **resolver addons** extend the resolver (the object returned by `.get()`, `.post()`, etc. that has `.json()`, `.text()`, and `.raw()` methods).

This is useful when you want to add custom response parsing strategies that apply to every request made by an instance.

### Defining a Resolver Addon

A `ResolverAddon` is a function that receives a `TalabResolver` and returns an extended resolver:

```ts
import type { ResolverAddon, Result } from "@abubakriz/talab";

// A resolver addon that adds `.jsonStrict()`
type StrictResolver = ResolverAddon<{
  jsonStrict<T>(): Promise<Result<T>>;
}>;

const strictResolver: StrictResolver = (resolver) => ({
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
```

### Applying Resolver Addons

There are two ways to apply resolver addons:

**Using `.resolver()`**

```ts
const api = talab
  .create({ base: "https://api.example.com" })
  .resolver(strictResolver);

// .jsonStrict() is now available on every resolver
const res = await api.get("/users").jsonStrict<User[]>();
```

**Using the `resolvers` config option**

> (Not recommended. It will lose type information!)

```ts
const api = talab.create({
  base: "https://api.example.com",
  resolvers: [strictResolver],
});
```

### Composition and Inheritance

Resolver addons compose just like middlewares. You can chain multiple `.resolver()` calls, and child instances inherit resolver addons from their parents:

```ts
const base = talab
  .create({ base: "https://api.example.com" })
  .resolver(addTimestamp)
  .resolver(addStrictJson);

// Child inherits both resolver addons
const authed = base.create({
  headers: { Authorization: "Bearer token" },
});

const res = await authed.get("/data").jsonStrict();
```

