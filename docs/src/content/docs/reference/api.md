---
title: API Reference
description: API Reference for Talab
---

## Core Types

### `TalabInstance`

The main interface for making requests.

#### Methods

- **`.get(url, init)`**: Make a GET request.
- **`.post(url, init)`**: Make a POST request.
- **`.put(url, init)`**: Make a PUT request.
- **`.patch(url, init)`**: Make a PATCH request.
- **`.delete(url, init)`**: Make a DELETE request.
- **`.head(url, init)`**: Make a HEAD request.
- **`.request(url, init)`**: Make a request with a custom HTTP method.
- **`.create(config)`**: Create a new instance inheriting the current configuration.
- **`.addon(addon)`**: Extend the instance with custom methods.
- **`.resolver(resolver)`**: Register a resolver addon that extends the resolver object returned by every request. Returns a new instance.

### `TalabResolver`

When making a request (e.g., `talab.get('/path')`), a `TalabResolver` is returned. You can choose how to parse the response:

- **`.json<T>()`**: Parses the response as JSON and returns strongly-typed data.
- **`.text()`**: Parses the response as plain text.
- **`.blob()`**: Parses the response as a Blob.
- **`.arrayBuffer()`**: Parses the response as an ArrayBuffer.
- **`.formData()`**: Parses the response as FormData.
- **`.raw()`**: Returns the raw native `Response` object.

Resolver addons can add additional methods to this object (see below).

### Result Object

The returned value from a request handler is a result object that discriminates on the `ok` property.

#### Success Result

If the network request was successful (including 4xx and 5xx status codes), the result object is a success.

```ts
{
  ok: true;
  status: number;
  data: T; // The parsed JSON, text, or raw Response
}
```

#### Error Result

If the network request failed (e.g., DNS error, timeout, abort, parse error), the result object is an error.

```ts
{
  ok: false;
  error: {
    type: "network" | "timeout" | "abort" | "parse" | "unknown";
    cause?: unknown;
  }
}
```

## Extension Types

### `Addon<T>`

A function that receives a `TalabInstance` and returns an extended instance with additional methods of type `T`.

```ts
type Addon<T> = (instance: TalabInstance) => TalabInstance & T;
```

### `ResolverAddon<T>`

A function that receives a `TalabResolver` and returns an extended resolver with additional methods of type `T`. Resolver addons are applied to every resolver returned by the instance's request methods.

```ts
type ResolverAddon<T> = (resolver: TalabResolver) => TalabResolver & T;
```

## Configuration

When creating an instance with `talab.create(config)`, you can pass the following options:

- **`base`** (`string`): The base URL for all requests.
- **`headers`** (`HeadersInit`): Default headers to include in all requests.
- **`timeout`** (`number`): The request timeout in milliseconds.
- **`middlewares`** (`Middleware[]`): An array of middlewares to apply.
- **`resolvers`** (`ResolverAddon[]`): An array of resolver addons to apply to every resolver.
- **`fetcher`** (`typeof fetch`): A custom fetch implementation.
