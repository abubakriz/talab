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

type TalabInstance = {
  request(url: string, options?: TalabOptions): TalabResolver;
  get(url: string, options?: TalabOptions): TalabResolver;
  post(url: string, options?: TalabOptions): TalabResolver;
  put(url: string, options?: TalabOptions): TalabResolver;
  patch(url: string, options?: TalabOptions): TalabResolver;
  delete(url: string, options?: TalabOptions): TalabResolver;
  head(url: string, options?: TalabOptions): TalabResolver;
  create(config?: TalabConfig): TalabInstance;
  addon<T extends Record<string, any>>(addon: Addon<T>): TalabInstance & T;
  config: Readonly<TalabConfig>;
};

export type {
  Addon,
  Err,
  FetchLike,
  Middleware,
  Ok,
  Result,
  TalabConfig,
  TalabError,
  TalabErrorType,
  TalabInstance,
  TalabOptions,
  TalabResolver,
};
