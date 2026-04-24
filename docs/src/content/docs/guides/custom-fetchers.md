---
title: Custom Fetchers
description: Learn how to provide a custom `fetch` implementation for Talab API.
---

You can provide a custom `fetch` implementation, which is useful for testing, proxies, or alternate runtimes like Node.js without native fetch.

```ts
const api = talab.create({
  fetcher: myCustomFetch
});
```
