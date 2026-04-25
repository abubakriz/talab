---
title: Getting Started
description: How to install and use Talab.
---

Talab is an HTTP client for JavaScript and TypeScript. It uses results-based error handling, eliminating the need for `try/catch` blocks around requests.

## Installation

You can install Talab using your preferred package manager:

```bash
npm install @abubakriz/talab
# or
yarn add @abubakriz/talab
# or
pnpm add @abubakriz/talab
# or
bun add @abubakriz/talab
```

## Basic Usage

With Talab, you don't need to wrap your requests in `try/catch` blocks to handle errors. Network failures and 4xx/5xx status codes are returned as part of the result object.

```ts
import { talab } from "@abubakriz/talab";

async function getPost(id: number) {
  const res = await talab
    .get(`https://api.example.com/posts/${id}`)
    .json<Post>();

  // Handle network errors (e.g., DNS failure, timeout)
  if (!res.ok) {
    console.error("Network error:", res.error.type);
    return null; 
  }

  // Handle expected status codes (e.g., 404 Not Found)
  if (res.status === 404) {
    return null;
  }

  // Handle successful data
  return res.data;
}
```

### HTTP Methods

Talab supports all standard HTTP methods out of the box:

```ts
const r1 = await talab.post("/echo", { json: { foo: "bar" } }).json();
const r2 = await talab.put("/echo", { json: { x: 1 } }).json();
const r3 = await talab.patch("/echo", { json: { x: 1 } }).json();
const r4 = await talab.delete("/echo").json();
const r5 = await talab.head("/json").raw();
```

You can also use `.request()` for custom methods:

```ts
const res = await talab.request("/echo", { method: "OPTIONS" }).raw();
```
