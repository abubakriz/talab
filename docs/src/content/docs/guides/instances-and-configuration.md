---
title: Instances and Configuration
description: Learn how to create isolated instances of Talab with specific default configurations.
---

You can create isolated instances of Talab with specific default configurations, such as base URLs and headers. These configurations merge intelligently.

```ts
import { talab } from "@abubakriz/talab";

const api = talab.create({
  base: "https://api.example.com",
  headers: { "X-App-Version": "1.0.0" }
});

// Inherits base URL and headers from `api`
const authed = api.create({
  headers: { Authorization: "Bearer token" }
});
```

Headers from parent and child instances will merge. For instance, `authed` will have both `X-App-Version` and `Authorization` headers.
