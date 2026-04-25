---
title: Timeouts and Abort Signals
description: Learn how to use timeouts and abort signals to control request cancellation in Talab.
---

Talab fully supports native `AbortSignal` for cancelling requests, as well as an easy-to-use `timeout` option.

## Using Timeouts

You can configure timeouts globally on an instance or explicitly on a per-request basis. If a request exceeds the timeout, it will be automatically aborted and the result object will contain an `abort` error.

```ts
import { talab } from "@abubakriz/talab";

// Set a 5-second global timeout for all requests on this instance
const api = talab.create({ timeout: 5000 });

// The request will be aborted if it takes longer than 5 seconds
const res = await api.get("/some-endpoint").json();

if (!res.ok && res.error.type === "abort") {
  console.error("The request timed out!");
}
```

You can also override the timeout for a specific request:

```ts
// Override the instance timeout with a 1-second timeout for this specific request
const fastRes = await api.get("/fast-endpoint", { timeout: 1000 }).json();
```

## Using Abort Signals

For more complex cancellation scenarios (such as cancelling a request when a user navigates away from a page or clicks a "Cancel" button), you can use a native `AbortController`.

```ts
const controller = new AbortController();

// Pass the signal to the request
const promise = talab.get("/long-polling-endpoint", {
  signal: controller.signal
}).json();

// Abort the request at any time
controller.abort();

const res = await promise;

if (!res.ok && res.error.type === "abort") {
  console.log("The request was manually cancelled.");
}
```

If you provide both a `timeout` and a custom `signal`, Talab intelligently combines them. The request will be aborted if *either* the timeout is reached *or* the custom signal is aborted.
