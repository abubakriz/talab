import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import type { Addon, Middleware, TalabInstance } from "../src";
import { talab } from "../src";

let server: ReturnType<typeof Bun.serve>;
let BASE: string;
let api: TalabInstance;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      if (path === "/echo") {
        return (async () => {
          const body =
            req.method !== "GET" && req.method !== "HEAD"
              ? await req.text()
              : null;
          return Response.json({
            method: req.method,
            headers: Object.fromEntries(req.headers),
            query: Object.fromEntries(url.searchParams),
            body,
            path: url.pathname,
          });
        })();
      }

      if (path === "/json") return Response.json({ id: 1, name: "talab" });

      if (path === "/text")
        return new Response("hello talab", {
          headers: { "Content-Type": "text/plain" },
        });

      if (path.startsWith("/status/")) {
        const segment = path.split("/")[2] ?? "0";
        const code = parseInt(segment, 10);
        return new Response(JSON.stringify({ status: code }), {
          status: code,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (path === "/slow")
        return new Promise((resolve) =>
          setTimeout(() => resolve(Response.json({ slow: true })), 2000),
        );

      if (path === "/bad-json")
        return new Response("not json {{{", {
          headers: { "Content-Type": "application/json" },
        });

      return new Response("Not Found", { status: 404 });
    },
  });

  BASE = `http://localhost:${server.port}`;
  api = talab.create({ base: BASE });
});

afterAll(() => {
  server.stop();
});

describe("GET requests", () => {
  it("fetches JSON", async () => {
    const r = await api.get("/json").json<{ id: number; name: string }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.id).toBe(1);
    expect(r.data.name).toBe("talab");
    expect(r.status).toBe(200);
  });

  it("fetches text", async () => {
    const r = await api.get("/text").text();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toBe("hello talab");
  });

  it("returns raw response", async () => {
    const r = await api.get("/json").raw();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toBeInstanceOf(Response);
  });
});

describe("HTTP status codes are successes", () => {
  it("404 is ok=true", async () => {
    const r = await api.get("/status/404").json<{ status: number }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe(404);
    expect(r.data.status).toBe(404);
  });

  it("500 is ok=true", async () => {
    const r = await api.get("/status/500").json<{ status: number }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe(500);
  });

  it("201 is ok=true", async () => {
    const r = await api.get("/status/201").json<{ status: number }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe(201);
  });
});

describe("HTTP methods", () => {
  it("POST with JSON body", async () => {
    const r = await api.post("/echo", { json: { foo: "bar" } }).json<{
      method: string;
      body: string;
      headers: Record<string, string>;
    }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.method).toBe("POST");
    expect(JSON.parse(r.data.body)).toEqual({ foo: "bar" });
    expect(r.data.headers["content-type"]).toBe("application/json");
  });

  it("PUT request", async () => {
    const r = await api
      .put("/echo", { json: { x: 1 } })
      .json<{ method: string }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.method).toBe("PUT");
  });

  it("PATCH request", async () => {
    const r = await api
      .patch("/echo", { json: { x: 1 } })
      .json<{ method: string }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.method).toBe("PATCH");
  });

  it("DELETE request", async () => {
    const r = await api.delete("/echo").json<{ method: string }>();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.method).toBe("DELETE");
  });

  it("HEAD request", async () => {
    const r = await api.head("/json").raw();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe(200);
  });

  it("custom method via .request()", async () => {
    const r = await api.request("/echo", { method: "OPTIONS" }).raw();
    expect(r.ok).toBe(true);
  });
});

describe("headers", () => {
  it("sets per-request headers", async () => {
    const r = await api
      .get("/echo", { headers: { "X-Custom": "test-value" } })
      .json<{ headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers["x-custom"]).toBe("test-value");
  });

  it("instance headers merge with request headers", async () => {
    const authed = talab.create({
      base: BASE,
      headers: { "X-One": "1" },
    });

    const r = await authed
      .get("/echo", { headers: { "X-Two": "2" } })
      .json<{ headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers["x-one"]).toBe("1");
    expect(r.data.headers["x-two"]).toBe("2");
  });
});

describe("query parameters", () => {
  it("appends query params", async () => {
    const r = await api
      .get("/echo", { query: { page: 1, limit: 10 } })
      .json<{ query: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.query.page).toBe("1");
    expect(r.data.query.limit).toBe("10");
  });
});

describe("create()", () => {
  it("inherits config", async () => {
    const authed = api.create({
      headers: { Authorization: "Bearer shared" },
    });

    const r = await authed
      .get("/echo")
      .json<{ headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers.authorization).toBe("Bearer shared");
  });

  it("merges headers from parent and child", async () => {
    const parent = talab.create({
      base: BASE,
      headers: { "X-Parent": "yes" },
    });
    const child = parent.create({
      headers: { "X-Child": "yes" },
    });

    const r = await child
      .get("/echo")
      .json<{ headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers["x-parent"]).toBe("yes");
    expect(r.data.headers["x-child"]).toBe("yes");
  });

  it("instances don't interfere", async () => {
    const [r1, r2] = await Promise.all([
      api.get("/json").json<{ id: number }>(),
      api
        .get("/echo", { query: { page: "2" } })
        .json<{ query: Record<string, string> }>(),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.data.id).toBe(1);
    expect(r2.data.query.page).toBe("2");
  });
});

describe("error handling", () => {
  it("network error", async () => {
    const bad = talab.create({ base: "http://localhost:1" });
    const r = await bad.get("/nope").json();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(["network", "unknown"]).toContain(r.error.type);
  });

  it("timeout", async () => {
    const r = await api.get("/slow", { timeout: 50 }).json();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(["timeout", "abort"]).toContain(r.error.type);
  });

  it("abort", async () => {
    const ac = new AbortController();
    ac.abort();
    const r = await api.get("/json", { signal: ac.signal }).json();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.type).toBe("abort");
  });

  it("parse failure", async () => {
    const r = await api.get("/bad-json").json();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.type).toBe("parse");
  });
});

describe("middleware", () => {
  it("modifies request", async () => {
    const addHeader: Middleware = (next) => (url, init) => {
      const headers = new Headers(init.headers);
      headers.set("X-Middleware", "injected");
      return next(url, { ...init, headers });
    };

    const mw = talab.create({ base: BASE, middlewares: [addHeader] });
    const r = await mw.get("/echo").json<{ headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers["x-middleware"]).toBe("injected");
  });

  it("intercepts response", async () => {
    const wrap: Middleware = (next) => async (url, init) => {
      const res = await next(url, init);
      const data = await res.json();
      return new Response(JSON.stringify({ wrapped: true, original: data }), {
        status: res.status,
        headers: res.headers,
      });
    };

    const mw = talab.create({ base: BASE, middlewares: [wrap] });
    const r = await mw
      .get("/json")
      .json<{ wrapped: boolean; original: { id: number } }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.wrapped).toBe(true);
    expect(r.data.original.id).toBe(1);
  });

  it("executes in order", async () => {
    const order: string[] = [];

    const mw1: Middleware = (next) => async (url, init) => {
      order.push("mw1-before");
      const res = await next(url, init);
      order.push("mw1-after");
      return res;
    };

    const mw2: Middleware = (next) => async (url, init) => {
      order.push("mw2-before");
      const res = await next(url, init);
      order.push("mw2-after");
      return res;
    };

    const mw = talab.create({ base: BASE, middlewares: [mw1, mw2] });
    await mw.get("/json").json();
    expect(order).toEqual([
      "mw1-before",
      "mw2-before",
      "mw2-after",
      "mw1-after",
    ]);
  });

  it("errors are caught as results", async () => {
    const failing: Middleware = () => () => {
      throw new TypeError("middleware boom");
    };

    const mw = talab.create({ base: BASE, middlewares: [failing] });
    const r = await mw.get("/json").json();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.type).toBe("network");
  });

  it("child inherits parent middlewares", async () => {
    const order: string[] = [];

    const parent: Middleware = (next) => async (url, init) => {
      order.push("parent");
      return next(url, init);
    };
    const child: Middleware = (next) => async (url, init) => {
      order.push("child");
      return next(url, init);
    };

    const base = talab.create({ base: BASE, middlewares: [parent] });
    const sub = base.create({ middlewares: [child] });
    await sub.get("/json").json();
    expect(order).toEqual(["parent", "child"]);
  });
});

describe("addons", () => {
  it("adds methods to the instance", async () => {
    type BearerAddon = Addon<{ bearer(token: string): TalabInstance }>;

    const bearerAddon: BearerAddon = (instance) => ({
      ...instance,
      bearer(token: string) {
        return instance.create({
          headers: { Authorization: `Bearer ${token}` },
        });
      },
    });

    const authed = api.addon(bearerAddon);
    const r = await authed
      .bearer("my-token")
      .get("/echo")
      .json<{ headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers.authorization).toBe("Bearer my-token");
  });
});

describe("form bodies", () => {
  it("url-encoded body", async () => {
    const r = await api
      .post("/echo", {
        body: new URLSearchParams({
          username: "admin",
          password: "secret",
        }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .json<{ body: string; headers: Record<string, string> }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.headers["content-type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(r.data.body).toContain("username=admin");
    expect(r.data.body).toContain("password=secret");
  });
});

describe("custom fetcher", () => {
  it("overrides fetch", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ mocked: true }), { status: 200 }),
      ),
    );

    const mocked = talab.create({ fetcher: mockFetch });
    const r = await mocked
      .get("https://fake.test/anything")
      .json<{ mocked: boolean }>();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.mocked).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
