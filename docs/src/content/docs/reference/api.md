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

### Response Handlers

When making a request (e.g., `talab.get('/path')`), you can choose how to parse the response:

- **`.json<T>()`**: Parses the response as JSON and returns strongly-typed data.
- **`.text()`**: Parses the response as plain text.
- **`.raw()`**: Returns the raw native `Response` object.

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

## Configuration

When creating an instance with `talab.create(config)`, you can pass the following options:

- **`base`** (`string`): The base URL for all requests.
- **`headers`** (`HeadersInit`): Default headers to include in all requests.
- **`timeout`** (`number`): The request timeout in milliseconds.
- **`middlewares`** (`Middleware[]`): An array of middlewares to apply.
- **`fetcher`** (`typeof fetch`): A custom fetch implementation.
