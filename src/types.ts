type TalabErrorType = "network" | "timeout" | "abort" | "parse" | "unknown";

type TalabError = {
  readonly type: TalabErrorType;
  readonly original?: unknown;
};

type Ok<T> = {
  readonly ok: true;
  readonly data: T;
  readonly response: Response;
  readonly status: number;
};

type Err = {
  readonly ok: false;
  readonly error: TalabError;
};

type Result<T> = Ok<T> | Err;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

type Middleware = (next: FetchLike) => FetchLike;

type TalabOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  json?: unknown;
  query?: Record<string, string | number | boolean>;
  timeout?: number;
  signal?: AbortSignal;
};

type TalabConfig = {
  base?: string;
  headers?: Record<string, string>;
  timeout?: number;
  middlewares?: Middleware[];
  resolvers?: ResolverAddon<any>[];
  fetcher?: FetchLike;
};

type TalabResolver = {
  json<T = any>(): Promise<Result<T>>;
  text(): Promise<Result<string>>;
  blob(): Promise<Result<Blob>>;
  arrayBuffer(): Promise<Result<ArrayBuffer>>;
  formData(): Promise<Result<FormData>>;
  raw(): Promise<Result<Response>>;
};

type Addon<T extends Record<string, any> = Record<string, any>> = (
  instance: TalabInstance,
) => TalabInstance & T;

type ResolverAddon<T extends Record<string, any> = Record<string, any>> = (
  resolver: TalabResolver,
) => TalabResolver & T;

// biome-ignore lint/complexity/noBannedTypes: It's used to collapse types in intersections cleanly
type TalabInstance<R extends Record<string, any> = {}> = {
  request(url: string, options?: TalabOptions): TalabResolver & R;
  get(url: string, options?: TalabOptions): TalabResolver & R;
  post(url: string, options?: TalabOptions): TalabResolver & R;
  put(url: string, options?: TalabOptions): TalabResolver & R;
  patch(url: string, options?: TalabOptions): TalabResolver & R;
  delete(url: string, options?: TalabOptions): TalabResolver & R;
  head(url: string, options?: TalabOptions): TalabResolver & R;
  create(config?: TalabConfig): TalabInstance<R>;
  addon<T extends Record<string, any>>(addon: Addon<T>): TalabInstance & T;
  resolver<T extends Record<string, any>>(
    resolver: ResolverAddon<T>,
  ): TalabInstance<R & T>;
  config: Readonly<TalabConfig>;
};

export type {
  Addon,
  Err,
  FetchLike,
  Middleware,
  Ok,
  ResolverAddon,
  Result,
  TalabConfig,
  TalabError,
  TalabErrorType,
  TalabInstance,
  TalabOptions,
  TalabResolver,
};
