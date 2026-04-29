import {
	API_VERSION,
	ENTERPRISE_V1_API_BASE_URL,
	ENTERPRISE_V2_API_BASE_URL,
	UnitConstants,
	V1_API_BASE_URL,
	V2_API_BASE_URL,
} from "../constants";
import type { AbstractLogger } from "../types/logger";
import {
	AbstractRequestClient,
	type ParseRateLimitDelayMs,
	type RequestRetryContext,
	type RequestRetryDelayContext,
	type RequestRetryOptions,
} from "../types/requests";
import type { Authentication } from "./auth";
import {
	BadSecretError,
	BadTokenError,
	DuplicateEntryError,
	ExpiredTokenError,
	FailedTypeValidationError,
	HTTPRequestError,
	InvalidBucketError,
	InvalidMethodError,
	InvalidOptionError,
	InvalidResourceError,
	LengthMismatchError,
	LibraryParsingError,
	LoginRequiredError,
	MaxLengthExceededError,
	MinLengthNotReachedError,
	NoGrantError,
	NotFoundError,
	ParameterRequiredError,
	RateLimitError,
	SystemUnavailableError,
	TimeoutError,
	TokenRegenerationRequiredError,
	UnexpectedError,
} from "./errors";

const defaultRetryableMethods = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"];
const defaultRetryableStatusCodes = [408, 425, 429, 500, 502, 503, 504];

const defaultParseRateLimitDelayMs: ParseRateLimitDelayMs = (
	response: Response,
): number | null => {
	const retryAfter = response.headers.get("retry-after");
	if (retryAfter) {
		const retryAfterSeconds = Number.parseFloat(retryAfter);
		if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
			return Math.round(retryAfterSeconds * UnitConstants.MS_IN_ONE_S);
		}

		const retryAtEpoch = Date.parse(retryAfter);
		if (!Number.isNaN(retryAtEpoch)) {
			return Math.max(retryAtEpoch - Date.now(), 0);
		}
	}

	const resetHeaders = [
		"x-ratelimit-reset-after",
		"x-rate-limit-reset-after",
		"x-ratelimit-reset",
		"x-rate-limit-reset",
	];

	for (const header of resetHeaders) {
		const raw = response.headers.get(header);
		if (!raw) {
			continue;
		}

		const value = Number.parseFloat(raw);
		if (!Number.isFinite(value)) {
			continue;
		}

		if (header.includes("after")) {
			return Math.max(Math.round(value * UnitConstants.MS_IN_ONE_S), 0);
		}

		const asEpochMs = value > 1_000_000_000_000 ? value : value * 1000;
		return Math.max(Math.round(asEpochMs - Date.now()), 0);
	}

	return null;
};

export const defaultRequestRetryOptions: Required<RequestRetryOptions> = {
	enabled: true,
	maxAttempts: 4,
	baseDelayMs: 250,
	maxDelayMs: 10_000,
	capRateLimitDelayToMaxDelayMs: false,
	backoffFactor: 2,
	jitterRatio: 0.25,
	retryableMethods: defaultRetryableMethods,
	retryableStatusCodes: defaultRetryableStatusCodes,
	parseRateLimitDelayMs: defaultParseRateLimitDelayMs,
	shouldRetry: () => false,
	resolveRetryDelayMs: (context: RequestRetryDelayContext) =>
		context.defaultDelayMs,
	onRetry: () => undefined,
};

export class RequestClient
	extends AbstractRequestClient
	implements AbstractRequestClient
{
	public retryOptions: Required<RequestRetryOptions> =
		defaultRequestRetryOptions;

	/**
	 * Creates a new request client to interact with the CFTools API
	 * @param authProvider The authentication provider to use for requests
	 * @param logger The logger to use for logging messages
	 * @param timeout The timeout for requests in milliseconds
	 * @param retryOptions Retry behavior for transient request failures
	 */
	constructor(
		private authProvider: Authentication,
		private logger: AbstractLogger,
		public timeout = 10000,
		retryOptions?: RequestRetryOptions,
	) {
		super();
		this.setRetryOptions(retryOptions);
		this.apiUrl = this.apiUrl.bind(this);
		this.resolveHeaders = this.resolveHeaders.bind(this);
		this.resolveRequestOptions = this.resolveRequestOptions.bind(this);
		this.setRetryOptions = this.setRetryOptions.bind(this);
		this.request = this.request.bind(this);
		this.get = this.get.bind(this);
		this.post = this.post.bind(this);
		this.put = this.put.bind(this);
		this.delete = this.delete.bind(this);
	}

	public setRetryOptions(options: RequestRetryOptions = {}): void {
		this.retryOptions = {
			...defaultRequestRetryOptions,
			...options,
			retryableMethods: (
				options.retryableMethods ?? defaultRetryableMethods
			).map((method) => method.toLocaleUpperCase()),
			retryableStatusCodes:
				options.retryableStatusCodes ?? defaultRetryableStatusCodes,
			parseRateLimitDelayMs:
				options.parseRateLimitDelayMs ?? defaultParseRateLimitDelayMs,
		};
	}

	/**
	 * Dynamically resolves an URL based on the version, path/endpoint, and parameters
	 * @param version The {@link API_VERSION} to use
	 * @param path The path/endpoint to request
	 * @param params The parameters (`URLSearchParams`) to include in the request
	 * @returns The resolved URL
	 */
	public apiUrl(
		version: API_VERSION,
		path: string,
		params?: Record<string, string> | URLSearchParams,
	): string {
		const baseUrl = this.authProvider.enterpriseToken
			? version === API_VERSION.V1
				? ENTERPRISE_V1_API_BASE_URL
				: ENTERPRISE_V2_API_BASE_URL
			: version === API_VERSION.V1
				? V1_API_BASE_URL
				: V2_API_BASE_URL;
		const resolvedParams = params
			? !(params instanceof URLSearchParams)
				? new URLSearchParams(params)
				: params
			: undefined;
		const resolvedUrl = `${baseUrl}${path}${resolvedParams ? `?${resolvedParams.toString()}` : ""}`;

		this.logger.debug(`Resolved API URL for version ${version}`, resolvedUrl);

		return resolvedUrl;
	}

	/**
	 * Resolves the headers for a request based on the current state of the client
	 * @param headersInit Initial headers for the request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The resolved headers for the request
	 */
	public resolveHeaders(
		headersInit: HeadersInit,
		isAuthenticating = false,
	): HeadersInit {
		const headers = {
			...headersInit,
			...this.authProvider.getHeaders(isAuthenticating),
			"User-Agent": this.authProvider.userAgent,
		};

		// Note: The CFTools API does not allow the Referer header
		// to be set to assist in DDOS protection and mitigation
		if ("Referer" in headers) {
			this.logger.warn(
				"Referer header is not allowed by the CFTools API, removing from request",
			);
			delete headers.Referer;
		}

		return headers;
	}

	/**
	 * Resolves the request options for a request depending on the current state of the client
	 * @param url The URL to request
	 * @param options The options for the request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The resolved request options
	 */
	public resolveRequestOptions(
		url: string,
		options: RequestInit,
		isAuthenticating = false,
	): RequestInit {
		const resolvedOptions: RequestInit = {
			...options,
			headers: this.resolveHeaders(options.headers ?? {}, isAuthenticating),
			signal: AbortSignal.timeout(this.timeout),
		};

		this.logger.debug(`Resolved request options for ${url}`, {
			...resolvedOptions,
			headers: {
				...resolvedOptions.headers,
				Authorization: "Bearer [REDACTED]",
				"X-Enterprise-Access-Token": Object.hasOwn(
					resolvedOptions.headers ?? {},
					"X-Enterprise-Access-Token",
				)
					? "[REDACTED]"
					: undefined,
			},
		});

		return resolvedOptions;
	}

	/**
	 * Perform a request to the CFTools API
	 * @param url The URL to request
	 * @param options The options for the request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The parsed JSON response from the request
	 * @throws {HTTPRequestError} Thrown if the request fails
	 * @throws {InvalidMethodError} Thrown if the request method is invalid
	 * @throws {ParameterRequiredError} Thrown if a required parameter is missing
	 * @throws {FailedTypeValidationError} Thrown if a supplied argument failed type validation
	 * @throws {InvalidOptionError} Thrown if a supplied option is not available for the selected route
	 * @throws {MaxLengthExceededError} Thrown if the maximum length of a parameter has been exceeded
	 * @throws {MinLengthNotReachedError} Thrown if the minimum length of a parameter has not been reached
	 * @throws {LengthMismatchError} Thrown if the length of a parameter does not match the expected length
	 * @throws {DuplicateEntryError} Thrown if a duplicate entry is detected
	 * @throws {LoginRequiredError} Thrown if the client is not authenticated
	 * @throws {TokenRegenerationRequiredError} Thrown if the authentication token needs to be regenerated
	 * @throws {BadSecretError} Thrown if the secret is invalid
	 * @throws {BadTokenError} Thrown if the token is invalid
	 * @throws {ExpiredTokenError} Thrown if the token has expired
	 * @throws {NoGrantError} Thrown if the token has no grant
	 * @throws {NotFoundError} Thrown if the requested resource was not found
	 * @throws {InvalidResourceError} Thrown if the requested resource is invalid
	 * @throws {InvalidBucketError} Thrown if the requested bucket is invalid
	 * @throws {RateLimitError} Thrown if the rate limit has been exceeded
	 * @throws {UnexpectedError} Thrown if an unexpected error occurred
	 * @throws {TimeoutError} Thrown if the request timed out
	 * @throws {SystemUnavailableError} Thrown if the system is unavailable
	 */
	public async request<T>(
		url: string,
		options: RequestInit,
		isAuthenticating = false,
	): Promise<T> {
		if (this.authProvider.shouldRefresh() && !isAuthenticating) {
			await this.authProvider.performRefresh();
		}

		const method = options.method?.toLocaleUpperCase() ?? "GET";
		const maxAttempts =
			this.retryOptions.enabled && !isAuthenticating
				? Math.max(1, this.retryOptions.maxAttempts)
				: 1;

		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			let response: Response;

			try {
				response = await fetch(
					url,
					this.resolveRequestOptions(url, options, isAuthenticating),
				);
			} catch (e) {
				const error = this.normalizeNetworkError(e);
				const context: RequestRetryContext = {
					url,
					method,
					options,
					attempt,
					maxAttempts,
					isAuthenticating,
					error,
				};

				if (await this.shouldRetry(context)) {
					await this.scheduleRetry(context);
					continue;
				}

				throw error;
			}

			if (!response.ok) {
				const context: RequestRetryContext = {
					url,
					method,
					options,
					attempt,
					maxAttempts,
					isAuthenticating,
					response,
					responseInfo: this.responseInfo(response),
				};
        
				if (await this.shouldRetry(context)) {
					await this.scheduleRetry(context);
					continue;
				}

				await this.errorHandler({ url, method }, response);
			}

			this.logger.debug(
				`${method} Request to ${url} successful`,
				response.statusText,
			);

			if (response.status === 204) {
				this.logger.debug(
					"Request was successful but returned no content, returning empty response",
				);
				return undefined as unknown as T;
			}

			let json: unknown;
			try {
				json = await response.json();
			} catch (e) {
				this.logger.error(
					"Failed to parse response",
					"error",
					`${e}`,
					"response",
					response,
				);
				throw new LibraryParsingError(
					"Failed to parse response, create a GitHub issue with the response body",
				);
			}

			this.logger.debug(`Parsed response from ${method} ${url}`, json);

			return json as T;
		}

		throw new HTTPRequestError(0, "Request failed after retries", null);
	}

	private normalizeNetworkError(error: unknown): HTTPRequestError {
		this.logger.error("Request failed", "error", `${error}`);

		if (error instanceof Error && error.name === "AbortError") {
			return new TimeoutError({
				status: 408,
				body: { error: "[abort] Request timed out" },
			});
		}

		if (error instanceof Error && error.name === "TimeoutError") {
			return new TimeoutError({
				status: 408,
				body: { error: "[timeout] Request timed out" },
			});
		}

		if (error instanceof HTTPRequestError) {
			return error;
		}

		return new HTTPRequestError(0, "Request failed", { error: `${error}` });
	}

	private async shouldRetry(context: RequestRetryContext): Promise<boolean> {
		if (!this.retryOptions.enabled || context.isAuthenticating) {
			return false;
		}

		if (context.attempt >= context.maxAttempts) {
			return false;
		}

		if (!this.retryOptions.retryableMethods.includes(context.method)) {
			return false;
		}

		if (await this.retryOptions.shouldRetry(context)) {
			return true;
		}

		if (context.response) {
			return this.retryOptions.retryableStatusCodes.includes(
				context.response.status,
			);
		}

		if (context.error instanceof TimeoutError) {
			return true;
		}

		if (context.error instanceof SystemUnavailableError) {
			return true;
		}

		return context.error instanceof HTTPRequestError && context.error.statusCode === 0;
	}

	private async scheduleRetry(context: RequestRetryContext): Promise<void> {
		const defaultDelayMs = this.defaultRetryDelayMs(context);
		const resolvedDelayMs = await this.retryOptions.resolveRetryDelayMs({
			...context,
			defaultDelayMs,
		});
		const safeDelayMs = Number.isFinite(resolvedDelayMs)
			? Math.max(0, Math.round(resolvedDelayMs))
			: 0;

		this.logger.warn(
			`Retrying ${context.method} ${context.url}`,
			`attempt ${context.attempt + 1}/${context.maxAttempts}`,
			`in ${safeDelayMs}ms`,
			context.responseInfo
				? `status ${context.responseInfo.status} ${context.responseInfo.statusText}`
				: context.error instanceof Error
					? context.error.message
					: `${context.error ?? "unknown error"}`,
		);

		await this.retryOptions.onRetry({ ...context, delayMs: safeDelayMs });

		if (safeDelayMs > 0) {
			await this.wait(safeDelayMs);
		}
	}

	private defaultRetryDelayMs(context: RequestRetryContext): number {
		if (context.response?.status === 429) {
			const headerDelay = this.retryOptions.parseRateLimitDelayMs(context.response);
			if (headerDelay !== null) {
				const safeHeaderDelayMs = Math.max(Math.round(headerDelay), 0);
				if (!this.retryOptions.capRateLimitDelayToMaxDelayMs) {
					return safeHeaderDelayMs;
				}

				return Math.min(safeHeaderDelayMs, this.retryOptions.maxDelayMs);
			}
		}

		const retryIndex = context.attempt - 1;
		const backoffDelayMs =
			this.retryOptions.baseDelayMs *
			this.retryOptions.backoffFactor ** Math.max(retryIndex, 0);
		const cappedDelayMs = Math.min(backoffDelayMs, this.retryOptions.maxDelayMs);

		if (this.retryOptions.jitterRatio <= 0) {
			return Math.round(cappedDelayMs);
		}

		const jitter = cappedDelayMs * this.retryOptions.jitterRatio;
		const min = Math.max(0, cappedDelayMs - jitter);
		const max = cappedDelayMs + jitter;

		return Math.round(min + Math.random() * (max - min));
	}

	private async wait(ms: number): Promise<void> {
		await new Promise<void>((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	private responseInfo(response: Response): {
		status: number;
		statusText: string;
		headers: Record<string, string>;
	} {
		return {
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
		};
	}

	/**
	 * Perform a GET request to the CFTools API
	 * @param url The URL to request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The parsed (JSON) response from the request
	 * @see {@link request}
	 */
	public async get<T>(url: string, isAuthenticating = false): Promise<T> {
		return this.request(url, { method: "GET" }, isAuthenticating);
	}

	/**
	 * Perform a POST request to the CFTools API
	 * @param url The URL to request
	 * @param body The body of the request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The parsed (JSON) response from the request
	 * @see {@link request}
	 */
	public async post<T>(
		url: string,
		body: Record<string, unknown>,
		isAuthenticating = false,
	): Promise<T> {
		return this.request(
			url,
			{ method: "POST", body: JSON.stringify(body) },
			isAuthenticating,
		);
	}

	/**
	 * Perform a PUT request to the CFTools API
	 * @param url The URL to request
	 * @param body The body of the request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The parsed (JSON) response from the request
	 * @see {@link request}
	 */
	public async put<T>(
		url: string,
		body: Record<string, unknown>,
		isAuthenticating = false,
	): Promise<T> {
		return this.request(
			url,
			{ method: "PUT", body: JSON.stringify(body) },
			isAuthenticating,
		);
	}

	/**
	 * Perform a DELETE request to the CFTools API
	 * @param url The URL to request
	 * @param isAuthenticating Whether the request is for authentication or not
	 * @returns The parsed (JSON) response from the request
	 * @see {@link request}
	 */
	public async delete<T>(url: string, isAuthenticating = false): Promise<T> {
		return this.request(url, { method: "DELETE" }, isAuthenticating);
	}

	/**
	 * Wraps request errors in a more user-friendly error
	 * @param request The request that failed
	 * @param response The response from the failed request
	 * @throws {HTTPRequestError} Thrown if the request fails
	 * @throws {InvalidMethodError} Thrown if the request method is invalid
	 * @throws {ParameterRequiredError} Thrown if a required parameter is missing
	 * @throws {FailedTypeValidationError} Thrown if a supplied argument failed type validation
	 * @throws {InvalidOptionError} Thrown if a supplied option is not available for the selected route
	 * @throws {MaxLengthExceededError} Thrown if the maximum length of a parameter has been exceeded
	 * @throws {MinLengthNotReachedError} Thrown if the minimum length of a parameter has not been reached
	 * @throws {LengthMismatchError} Thrown if the length of a parameter does not match the expected length
	 * @throws {DuplicateEntryError} Thrown if a duplicate entry is detected
	 * @throws {LoginRequiredError} Thrown if the client is not authenticated
	 * @throws {TokenRegenerationRequiredError} Thrown if the authentication token needs to be regenerated
	 * @throws {BadSecretError} Thrown if the secret is invalid
	 * @throws {BadTokenError} Thrown if the token is invalid
	 * @throws {ExpiredTokenError} Thrown if the token has expired
	 * @throws {NoGrantError} Thrown if the token has no grant
	 * @throws {NotFoundError} Thrown if the requested resource was not found
	 * @throws {InvalidResourceError} Thrown if the requested resource is invalid
	 * @throws {InvalidBucketError} Thrown if the requested bucket is invalid
	 * @throws {RateLimitError} Thrown if the rate limit has been exceeded
	 * @throws {UnexpectedError} Thrown if an unexpected error occurred
	 * @throws {TimeoutError} Thrown if the request timed out
	 * @throws {SystemUnavailableError} Thrown if the system is unavailable
	 */
	private async errorHandler(
		request: {
			url: string;
			method: string;
		},
		response: Response,
	): Promise<void> {
		this.logger.error("Request failed", response.statusText);

		let body: unknown;
		try {
			body = await response.json();
			this.logger.error(
				"Request error",
				"response-body",
				JSON.stringify(body),
				"headers",
				response.headers,
			);
		} catch (e) {
			this.logger.error(
				"Failed to parse error response",
				"error",
				`${e}`,
				"headers",
				response.headers,
			);
		}

		const status: number = response.status;
		const safeError: string | null =
			typeof body === "object" &&
			body &&
			"error" in body &&
			typeof body.error === "string"
				? body.error
				: null;

		const errorBody = {
			statusCode: status,
			url: request.url,
			method: request.method,
			body: body,
			headers: response.headers,
		};

		switch (status) {
			case 400: {
				switch (safeError) {
					case "invalid-method":
						throw new InvalidMethodError(errorBody);
					case "parameter-required":
						throw new ParameterRequiredError(errorBody);
					case "failed-type-validation":
						throw new FailedTypeValidationError(errorBody);
					case "invalid-option":
						throw new InvalidOptionError(errorBody);
					case "max-length-exceeded":
						throw new MaxLengthExceededError(errorBody);
					case "min-length-too-small":
						throw new MinLengthNotReachedError(errorBody);
					case "length-missmatch":
						throw new LengthMismatchError(errorBody);
					case "duplicate":
						throw new DuplicateEntryError(errorBody);
				}
				break;
			}
			case 401: {
				if (safeError === "login-required") {
					throw new LoginRequiredError(errorBody);
				}
				break;
			}
			case 403: {
				switch (safeError) {
					case "token-regeneration-required":
						throw new TokenRegenerationRequiredError(errorBody);
					case "bad-secret":
						throw new BadSecretError(errorBody);
					case "bad-token":
						throw new BadTokenError(errorBody);
					case "expired-token":
						throw new ExpiredTokenError(errorBody);
					case "no-grant":
						throw new NoGrantError(errorBody);
				}
				break;
			}
			case 404: {
				switch (safeError) {
					case "not-found":
						throw new NotFoundError(
							errorBody,
							"The requested resource was not found",
						);
					case "invalid-resource":
						throw new InvalidResourceError(errorBody);
					case "invalid-bucket":
						throw new InvalidBucketError(errorBody);
				}
				throw new NotFoundError(errorBody);
			}
			case 429: {
				throw new RateLimitError(errorBody);
			}
			case 500: {
				switch (safeError) {
					case "unexpected":
						throw new UnexpectedError(errorBody);
					case "timeout":
						throw new TimeoutError(errorBody);
					case "system-unavailable":
						throw new SystemUnavailableError(errorBody);
				}
				break;
			}
		}

		throw new HTTPRequestError(
			status,
			`Request failed: ${response.statusText} (${response.status})`,
			errorBody,
		);
	}
}
