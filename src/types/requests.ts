import type { API_VERSION } from "../constants";

/**
 * Runtime information provided to retry hooks.
 *
 * The context is intentionally rich so you can make deterministic retry
 * decisions based on request method, attempt count, response metadata, and
 * transport-level errors.
 */
export type RequestRetryContext = {
	/** The full request URL. */
	url: string;
	/** The normalized HTTP method (for example, `GET` or `POST`). */
	method: string;
	/** The original request options passed into the request client. */
	options: RequestInit;
	/** The current attempt number, starting at `1`. */
	attempt: number;
	/** The maximum attempts permitted for this request. */
	maxAttempts: number;
	/** Indicates whether this request is part of authentication flow. */
	isAuthenticating: boolean;
	/** Raw response object for failed HTTP requests, if available. */
	response?: Response;
	/**
	 * Serializable response metadata for logging/telemetry.
	 *
	 * Useful when your logger serializes plain objects and would otherwise show
	 * the raw `Response` as `Response {}`.
	 */
	responseInfo?: {
		/** HTTP status code, for example `429`. */
		status: number;
		/** HTTP status text, for example `Too Many Requests`. */
		statusText: string;
		/** Flattened response headers. */
		headers: Record<string, string>;
	};
	/** Normalized request/transport error for failed network attempts. */
	error?: unknown;
};

/**
 * Context for custom delay calculation.
 *
 * `defaultDelayMs` contains the delay computed by the built-in strategy
 * (rate-limit header parsing or exponential backoff + jitter).
 */
export type RequestRetryDelayContext = RequestRetryContext & {
	/** Delay computed by the built-in retry strategy. */
	defaultDelayMs: number;
};

/**
 * Context emitted to the retry callback after the final delay is resolved.
 */
export type RequestRetryCallbackContext = RequestRetryContext & {
	/** Final delay (in ms) before the next retry attempt. */
	delayMs: number;
};

/**
 * Parses rate-limit headers and returns a delay in milliseconds.
 *
 * Return `null` when no usable rate-limit signal is available and the client
 * should fall back to exponential backoff.
 */
export type ParseRateLimitDelayMs = (response: Response) => number | null;

/**
 * Retry configuration for the request client.
 *
 * These options are designed to support two common production patterns:
 * 1. Interactive/latency-sensitive flows with bounded retry delays.
 * 2. Background/worker flows that can fully honor server `Retry-After` values.
 *
 * @example
 * Respect server rate-limit windows (default behavior):
 * ```ts
 * const client = new CFToolsClient(auth, {
 *   retryOptions: {
 *     maxAttempts: 4,
 *   },
 * });
 * ```
 *
 * @example
 * Cap server-provided rate-limit delays for interactive UX:
 * ```ts
 * const client = new CFToolsClient(auth, {
 *   retryOptions: {
 *     maxDelayMs: 5_000,
 *     capRateLimitDelayToMaxDelayMs: true,
 *   },
 * });
 * ```
 */
export type RequestRetryOptions = {
	/** Enables retry logic globally for non-authentication requests. */
	enabled?: boolean;
	/** Maximum number of attempts per request (including the first attempt). */
	maxAttempts?: number;
	/** Base delay (in ms) used for exponential backoff. */
	baseDelayMs?: number;
	/** Upper bound (in ms) for computed non-rate-limit backoff delays. */
	maxDelayMs?: number;
	/**
	 * If `true`, caps server-provided rate-limit delays to `maxDelayMs`.
	 *
	 * If `false`, server-provided delay values are trusted and used as-is.
	 */
	capRateLimitDelayToMaxDelayMs?: boolean;
	/** Exponential backoff factor applied per retry step. */
	backoffFactor?: number;
	/**
	 * Jitter ratio applied to computed backoff delay.
	 *
	 * For example, `0.25` randomizes delay within +/-25%.
	 */
	jitterRatio?: number;
	/** HTTP methods eligible for retries. */
	retryableMethods?: string[];
	/** HTTP status codes eligible for retries. */
	retryableStatusCodes?: number[];
	/**
	 * Extracts rate-limit delay from response headers.
	 *
	 * When this returns `null`, backoff strategy is used instead.
	 */
	parseRateLimitDelayMs?: ParseRateLimitDelayMs;
	/**
	 * Optional override hook for retry eligibility.
	 *
	 * Return `true` to force retry and `false` to defer to built-in policy.
	 */
	shouldRetry?: (context: RequestRetryContext) => boolean | Promise<boolean>;
	/**
	 * Optional hook to customize delay calculation before a retry.
	 *
	 * Return any non-negative delay in milliseconds.
	 */
	resolveRetryDelayMs?: (
		context: RequestRetryDelayContext,
	) => number | Promise<number>;
	/**
	 * Callback invoked whenever a retry is scheduled.
	 *
	 * Useful for metrics, tracing, or structured logging.
	 */
	onRetry?: (
		context: RequestRetryCallbackContext,
	) => void | Promise<void>;
};

/**
 * Base contract for request clients used by this library.
 */
export abstract class AbstractRequestClient {
	/** Resolved retry configuration currently in effect. */
	public abstract retryOptions: Required<RequestRetryOptions>;
	/** Updates retry configuration at runtime. */
	public abstract setRetryOptions(options?: RequestRetryOptions): void;

	/** Resolves API URL from version, path, and query parameters. */
	public abstract apiUrl(
		version: API_VERSION,
		path: string,
		params?: URLSearchParams,
	): string;
	/** Resolves effective request headers. */
	public abstract resolveHeaders(
		headersInit: HeadersInit,
		omitAuthHeaders?: boolean,
	): HeadersInit;
	/** Resolves effective request options (headers, signal, etc.). */
	public abstract resolveRequestOptions(
		url: string,
		options: RequestInit,
		omitAuthHeaders?: boolean,
	): RequestInit;
	/** Executes a request and returns parsed response payload. */
	public abstract request<T>(
		url: string,
		options: RequestInit,
		omitAuthHeaders?: boolean,
	): Promise<T>;

	/** Executes a GET request. */
	public abstract get<T>(url: string, omitAuthHeaders?: boolean): Promise<T>;
	/** Executes a POST request. */
	public abstract post<T>(
		url: string,
		body: Record<string, unknown>,
		omitAuthHeaders?: boolean,
	): Promise<T>;
	/** Executes a PUT request. */
	public abstract put<T>(
		url: string,
		body: Record<string, unknown>,
		omitAuthHeaders?: boolean,
	): Promise<T>;
	/** Executes a DELETE request. */
	public abstract delete<T>(url: string, omitAuthHeaders?: boolean): Promise<T>;
}
