import {
	AUTHENTICATION_TOKEN_REFRESH_INTERVAL,
	AUTHENTICATION_TOKEN_VALIDITY_BUFFER,
} from "../constants";
import { userAgent } from "../resolvers/library";
import type {
	AuthenticationData,
	AuthHeaders,
	ClientAuthentication,
	ClientAuthenticationData,
} from "../types/auth";
import type { AbstractLogger } from "../types/logger";
import type { CFToolsClient } from "./client";
import {
	ExpiredTokenError,
	LoginRequiredError,
	MissingServerApiIdError,
} from "./errors";

export class Authentication
	implements AuthenticationData, ClientAuthenticationData
{
	/**
	 * The CFTools client instance, used for making (authentication) requests.
	 */
	private client: CFToolsClient;
	/**
	 * The logger instance, used for logging messages - by default an extension of the
	 * logger attached to the primary {@link CFToolsClient} instance.
	 */
	private logger: AbstractLogger;

	/** The date and time the authentication token was issued. */
	public issuedAt: Date | null = null;
	/** The date and time the authentication token expires. */
	public expiresAt: Date | null = null;

	/**
	 * The user agent to use for making requests.
	 *
	 * Note from the documentation: All requests must contain a User-Agent header containing your application id.
	 */
	public userAgent: string;
	/**
	 * The application ID to use for authenticating with the CFTools API,
	 * obtained {@link https://developer.cftools.cloud/applications here}.
	 */
	public applicationId: string;
	/**
	 * The application secret to use for authenticating with the CFTools API,
	 * obtained {@link https://developer.cftools.cloud/applications here}.
	 * This should be kept secret and not shared.
	 */
	public applicationSecret: string;
	/** The default server API ID to use for actions, can be overridden in requests. */
	public serverApiId?: string;
	/**
	 * The enterprise token to use for authenticating with the CFTools
	 * API, privately obtained from the CFTools team.
	 */
	public enterpriseToken?: string;

	/** Whether the authentication token is currently refreshing. */
	private currentlyRefreshing = false;
	/** Whether the client is currently authenticated. */
	public authenticated = false;
	/** The authentication token to use for making requests. */
	public authenticationToken: string | null = null;
	/** The timeout for refreshing the authentication token. */
	public refreshTimeout: NodeJS.Timeout | null = null;

	/**
	 * Creates a new authentication instance to authenticate
	 * against the CFTools (Data) API.
	 * @param client The CFTools client instance.
	 * @param clientAuth The client authentication data.
	 * @param logger The logger instance.
	 */
	constructor(
		client: CFToolsClient,
		clientAuth: ClientAuthenticationData,
		logger: AbstractLogger,
	) {
		this.client = client;
		this.logger = logger;

		this.userAgent =
			clientAuth.userAgent ?? userAgent(clientAuth.applicationId);
		this.applicationId = clientAuth.applicationId;
		this.applicationSecret = clientAuth.applicationSecret;
		this.serverApiId = clientAuth.serverApiId;
		this.enterpriseToken = clientAuth.enterpriseToken;

		this.logger.debug(
			`Initialized authentication for application ID ${this.applicationId}`,
		);

		this.getAuthenticationBody = this.getAuthenticationBody.bind(this);
		this.getHeaders = this.getHeaders.bind(this);
		this.isExpired = this.isExpired.bind(this);
		this.shouldRefresh = this.shouldRefresh.bind(this);
		this.isRefreshing = this.isRefreshing.bind(this);
		this.setRefreshing = this.setRefreshing.bind(this);
		this.performRefresh = this.performRefresh.bind(this);
		this.throwExpired = this.throwExpired.bind(this);
		this.resolveServerApiId = this.resolveServerApiId.bind(this);
	}

	/**
	 * @returns The body required for authenticating with the CFTools API.
	 */
	public getAuthenticationBody() {
		const result = {
			application_id: this.applicationId,
			secret: this.applicationSecret,
		};

		this.logger.debug("Generated authentication body", result);

		return result;
	}

	/**
	 * Returns the headers required for making requests to the CFTools API.
	 * @param isAuthenticating Whether the headers are for an authentication request.
	 * @returns The headers required for making requests to the CFTools API.
	 * @throws {LoginRequiredError} Thrown if the client is not authenticated.
	 */
	public getHeaders(isAuthenticating = false): AuthHeaders {
		if (isAuthenticating) {
			if (this.enterpriseToken?.length) {
				return {
					"X-Enterprise-Access-Token": this.enterpriseToken,
				};
			}
			return {};
		}

		if (!this.authenticated) {
			throw new LoginRequiredError(null);
		}

		const headers: AuthHeaders = {
			Authorization: `Bearer ${this.authenticationToken}`,
		};

		if (this.enterpriseToken?.length) {
			headers["X-Enterprise-Access-Token"] = this.enterpriseToken;
		}

		return headers;
	}

	/**
	 * @returns Whether the authentication token has expired.
	 */
	public isExpired(): boolean {
		if (!this.expiresAt) {
			return true;
		}

		return this.expiresAt.getTime() < Date.now();
	}

	/**
	 * @returns Whether the authentication token should be refreshed.
	 */
	public shouldRefresh(): boolean {
		if (this.isExpired()) {
			this.logger.debug("Token is expired, refreshing");
			return true;
		}

		if (!this.issuedAt || !this.expiresAt) {
			this.logger.debug("Token has not been issued or expired, refreshing");
			return true;
		}

		const now = Date.now();
		const expiresAt = this.expiresAt.getTime();
		const validityBuffer = AUTHENTICATION_TOKEN_VALIDITY_BUFFER;

		this.logger.debug("Checking if token should be refreshed", {
			now,
			expiresAt,
			validityBuffer,
		});

		return expiresAt - now < validityBuffer;
	}

	/**
	 * @returns Whether the authentication token is currently refreshing.
	 */
	public isRefreshing(): boolean {
		this.logger.debug(
			"Checking if token is currently refreshing",
			this.currentlyRefreshing,
		);
		return this.currentlyRefreshing;
	}

	/**
	 * Sets the authentication token refreshing state.
	 * @param refreshing Whether the authentication token is refreshing.
	 */
	public setRefreshing(refreshing: boolean): void {
		this.logger.debug("Setting token refreshing state", refreshing);
		this.currentlyRefreshing = refreshing;
	}

	/**
	 * Returns the current authentication token.
	 * @returns The current authentication token.
	 * @throws {LoginRequiredError} Thrown if the client is not authenticated.
	 */
	public currentToken(): ClientAuthentication {
		if (!this.authenticated || !this.authenticationToken) {
			throw new LoginRequiredError(null);
		}

		this.logger.debug("Returning existing authentication token");

		return {
			issuedAt: this.issuedAt,
			expiresAt: this.expiresAt,
			token: this.authenticationToken,
		};
	}

	/**
	 * Refreshes the authentication token.
	 * @returns A promise that resolves when the authentication token has been refreshed.
	 * @throws {ExpiredTokenError} Thrown if the authentication token has expired.
	 * @throws {LoginRequiredError} Thrown if the client is not authenticated.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is required but missing.
	 * @throws {Error} Thrown if the authentication token could not be refreshed.
	 */
	public async performRefresh(): Promise<void> {
		if (!this.shouldRefresh()) {
			this.logger.debug("Token does not need to be refreshed");
			return;
		}

		if (this.isRefreshing()) {
			this.logger.debug("Token is already refreshing, waiting for completion");
			await new Promise((resolve) => {
				const interval = setInterval(() => {
					if (!this.isRefreshing()) {
						clearInterval(interval);
						resolve(null);
					}
				}, 100);
			});
			this.logger.debug("Token has finished refreshing");
		}

		this.setRefreshing(true);
		const newAuthentication = await this.client.authenticate();
		this.issuedAt = newAuthentication.issuedAt;
		this.expiresAt = newAuthentication.expiresAt;
		this.authenticationToken = newAuthentication.token;
		this.setRefreshing(false);

		if (this.refreshTimeout) {
			this.logger.debug("Clearing existing refresh timeout");
			clearInterval(this.refreshTimeout);
		}

		this.refreshTimeout = setInterval(() => {
			this.logger.debug("Refreshing token");
			this.performRefresh();
		}, AUTHENTICATION_TOKEN_REFRESH_INTERVAL);

		return;
	}

	/**
	 * Throws an error if the authentication token has expired.
	 * @throws {ExpiredTokenError} Thrown if the authentication token has expired.
	 */
	public throwExpired(): void {
		if (this.isExpired()) {
			throw new ExpiredTokenError(null);
		}
	}

	/**
	 * Resolves the server API ID to use for an action.
	 * @param serverApiId The server API ID to use.
	 * @param require Whether the server API ID is required or not.
	 * @returns The resolved server API ID.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is required but missing.
	 */
	public resolveServerApiId(
		serverApiId?: string,
		require?: false,
	): string | null;
	public resolveServerApiId(serverApiId?: string, require?: true): string;
	public resolveServerApiId(
		serverApiId?: string,
		require = false,
	): string | null {
		if (serverApiId) {
			this.logger.debug("Resolved server API ID", serverApiId);
			return serverApiId;
		}

		if (this.serverApiId) {
			this.logger.debug(
				"Resolved server API ID from client authentication data",
				this.serverApiId,
			);
			return this.serverApiId;
		}

		if (require) {
			this.logger.error("Server API ID is missing");
			throw new MissingServerApiIdError();
		}

		this.logger.debug("Server API ID is not required and missing");
		return null;
	}
}
