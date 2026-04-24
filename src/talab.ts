import type {
  Err,
  Ok,
  ResolverAddon,
  Result,
  TalabConfig,
  TalabError,
  TalabInstance,
  TalabOptions,
  TalabResolver,
} from "./types.ts";

const ok = <T>(data: T, response: Response): Ok<T> => ({
  ok: true,
  data,
  response,
  status: response.status,
});

const err = (error: TalabError): Err => ({
  ok: false,
  error,
});

function classify(e: unknown): TalabError {
  if (!(e instanceof Error)) {
    return { type: "unknown", original: e };
  }

  if (e.name === "AbortError") {
    return { type: "abort", original: e };
  }

  if (e.name === "TimeoutError") {
    return { type: "timeout", original: e };
  }

  // In fetch, TypeError signifies a network/CORS failure
  return { type: "network", original: e };
}

function create(cfg: TalabConfig = {}): TalabInstance {
  function request(url: string, options: TalabOptions = {}): TalabResolver {
    const method = options.method ?? "GET";
    const headers = {
      ...cfg.headers,
      ...options.headers,
    };

    let body = options.body;
    if (options.json !== undefined) {
      body = JSON.stringify(options.json);
      headers["Content-Type"] ??= "application/json";
    }

    // Build URL
    const urlObj = new URL(url, cfg.base || undefined);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        urlObj.searchParams.append(key, String(value));
      }
    }

    const finalUrl = urlObj.toString();

    // Build init
    const init: RequestInit = { method, headers };
    if (body != null) {
      init.body = body;
    }

    // Timeout / signal
    const timeout = options.timeout ?? cfg.timeout ?? 0;
    const signal = options.signal;

    const signals = [];

    if (timeout > 0) {
      signals.push(AbortSignal.timeout(timeout));
    }

    if (signal) {
      signals.push(signal);
    }

    if (signals.length > 1) {
      init.signal = AbortSignal.any(signals);
    } else if (signals.length === 1) {
      init.signal = signals[0];
    }

    // Pipeline
    let pipeline = cfg.fetcher ?? fetch;
    const middlewares = cfg.middlewares ?? [];
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const mw = middlewares[i];
      if (mw) {
        pipeline = mw(pipeline);
      }
    }

    // Resolver
    const execute = async (): Promise<Result<Response>> => {
      try {
        const response = await pipeline(finalUrl, init);
        return ok(response, response);
      } catch (e) {
        return err(classify(e));
      }
    };

    const parse = async <T>(
      parser: (res: Response) => Promise<T>,
    ): Promise<Result<T>> => {
      const response = await execute();
      if (!response.ok) {
        return response;
      }

      try {
        const data = await parser(response.data);
        return ok(data, response.response);
      } catch (e) {
        return err({ type: "parse", original: e });
      }
    };

    let resolver: TalabResolver = {
      json: <T = any>() => parse<T>((r) => r.json() as Promise<T>),
      text: () => parse((r) => r.text()),
      blob: () => parse((r) => r.blob()),
      arrayBuffer: () => parse((r) => r.arrayBuffer()),
      formData: () => parse((r) => r.formData() as Promise<FormData>),
      raw: execute,
    };

    // Apply resolver addons
    const resolvers = cfg.resolvers ?? [];
    for (const addon of resolvers) {
      resolver = addon(resolver);
    }

    return resolver;
  }

  const instance: TalabInstance = {
    request,
    get: (url, opts) => request(url, { ...opts, method: "GET" }),
    post: (url, opts) => request(url, { ...opts, method: "POST" }),
    put: (url, opts) => request(url, { ...opts, method: "PUT" }),
    patch: (url, opts) => request(url, { ...opts, method: "PATCH" }),
    delete: (url, opts) => request(url, { ...opts, method: "DELETE" }),
    head: (url, opts) => request(url, { ...opts, method: "HEAD" }),
    create: (newCfg = {}) =>
      create({
        ...cfg,
        ...newCfg,
        headers: { ...cfg.headers, ...newCfg.headers },
        middlewares: [
          ...(cfg.middlewares ?? []),
          ...(newCfg.middlewares ?? []),
        ],
        resolvers: [...(cfg.resolvers ?? []), ...(newCfg.resolvers ?? [])],
      }),
    addon: (addon) => addon(instance),
    resolver: <T extends Record<string, any>>(resolver: ResolverAddon<T>) =>
      instance.create({ resolvers: [resolver] }) as TalabInstance<T>,
    config: cfg,
  };

  return instance;
}

const talab = create();

export { talab };
