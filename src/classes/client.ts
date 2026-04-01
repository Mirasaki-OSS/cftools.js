import { isIPv4 } from "node:net";
import {
	API_VERSION,
	AUTHENTICATION_TOKEN_REFRESH_INTERVAL,
	CFTOOLS_BASE_URL,
	UnitConstants,
} from "../constants";
import { GameLabsActionCode } from "../types/general";
import { Authentication } from "./auth";
import { CacheManager } from "./cache";
import {
	DuplicateEntryError,
	InvalidOptionError,
	LengthMismatchError,
	MaxLengthExceededError,
	MinLengthNotReachedError,
	MissingServerApiIdError,
	NotFoundError,
} from "./errors";
import { ConsoleLogger } from "./logger";
import { RequestClient } from "./requests";

void typeof MissingServerApiIdError; // Keep in bundle for @throws

import {
	type AnyPlayerId,
	isCFToolsId,
	isSteam64,
} from "../resolvers/player-ids";
import {
	type ResolveServerIdOptions,
	resolveServerId,
} from "../resolvers/server-id";
import {
	transformBanListResponse,
	transformGameLabsActionsResponse,
	transformGameLabsEntityEventsResponse,
	transformGameLabsEntityVehiclesResponse,
	transformGameServerDetails,
	transformGrantResponse,
	transformLeaderboardResponse,
	transformPlayerListResponse,
	transformPlayerStatsResponse,
	transformPriorityQueueResponse,
	transformServerInfoResponse,
	transformServerStatisticsResponse,
	transformWhitelistResponse,
} from "../resolvers/transformers";
import type {
	ClientAuthentication,
	ClientAuthenticationData,
} from "../types/auth";
import type { AbstractLogger } from "../types/logger";
import type {
	AuthenticationResponse,
	BatchPostGameLabsActionOptions,
	ChangeWorldTimeOptions,
	ChangeWorldWeatherOptions,
	ClientGameLabsActionsResponse,
	ClientGameLabsEntityEventsResponse,
	ClientGameLabsEntityVehiclesResponse,
	ClientGameServerResponse,
	ClientGrantsResponse,
	ClientLeaderboardResponse,
	ClientListBansResponse,
	ClientLookupUserResponse,
	ClientPlayerListResponse,
	ClientPlayerStatsResponse,
	ClientPriorityQueueResponse,
	ClientServerInfoResponse,
	ClientServerStatisticsResponse,
	ClientWhitelistResponse,
	CreateBanOptions,
	DeleteBanOptions,
	DeletePlayerStatsOptions,
	DeletePriorityQueueOptions,
	DeleteWhitelistOptions,
	GameLabsActionsResponse,
	GameLabsActionTarget,
	GameLabsEntityEventsResponse,
	GameLabsEntityVehiclesResponse,
	GameServerResponse,
	GetPlayerStatsOptions,
	GetPriorityQueueOptions,
	GetSessionByCFToolsIdOptions,
	GetWhitelistOptions,
	GrantsResponse,
	IdentifierActionOptionsNoParams,
	KickOptions,
	LBMutePlayerOptions,
	LeaderboardOptions,
	LeaderboardResponse,
	ListBansOptions,
	ListBansResponse,
	LookupUserResponse,
	MessagePrivateOptions,
	MessageServerOptions,
	PlayerListResponse,
	PlayerStatsResponse,
	PostGameLabsActionOptions,
	PostPriorityQueueOptions,
	PostWhitelistOptions,
	PriorityQueueResponse,
	RawRConCommandOptions,
	ServerInfoResponse,
	ServerStatisticsResponse,
	SpawnItemOnGroundOptions,
	SpawnItemOnPlayerOptions,
	TargetActionOptionsNoParams,
	TeleportPlayerOptions,
	WhitelistResponse,
	WrdgPushTransportOptions,
} from "../types/responses";
import { isNotFoundError } from "./type-guards";

/**
 * CacheConfigurationEntry is a tuple that represents the cache configuration
 * for a specific cache key. The first element is the time-to-live (TTL) in
 * seconds, and the second element is the maximum number of items to store.
 */
export type CacheConfigurationEntry = [number, number];

/**
 * CacheConfiguration is an object that represents the cache configuration
 * for all cache keys in the client. Caching is only performed for GET
 * requests, and the cache configuration is used to determine the TTL and
 * maximum size of the cache for each key.
 */
export type CacheConfiguration = {
	appGrants: CacheConfigurationEntry;
	gameServerDetails: CacheConfigurationEntry;
	userLookup: CacheConfigurationEntry;
	listBans: CacheConfigurationEntry;
	serverInfo: CacheConfigurationEntry;
	serverStatistics: CacheConfigurationEntry;
	playerList: CacheConfigurationEntry;
	gameLabsActions: CacheConfigurationEntry;
	gameLabsEntityEvents: CacheConfigurationEntry;
	gameLabsEntityVehicles: CacheConfigurationEntry;
	priorityQueue: CacheConfigurationEntry;
	whitelist: CacheConfigurationEntry;
	leaderboard: CacheConfigurationEntry;
	playerStats: CacheConfigurationEntry;
};

/**
 * The default configuration for caching in the client. The first element
 * in each tuple is the time-to-live (TTL) in seconds, and the second element
 * is the maximum number of items to store.
 */
export const defaultCacheConfiguration: CacheConfiguration = {
	appGrants: [60, 1],
	gameServerDetails: [30, 100],
	userLookup: [3600, 500],
	listBans: [60, 100],
	serverInfo: [60, 100],
	serverStatistics: [60, 100],
	playerList: [30, 100],
	gameLabsActions: [60, 5],
	gameLabsEntityEvents: [60, 5],
	gameLabsEntityVehicles: [60, 5],
	priorityQueue: [60, 250],
	whitelist: [60, 100],
	leaderboard: [60, 5],
	playerStats: [60, 250],
};

/**
 * A string that represents the prefix for a cache key. The prefix is used
 * to determine the cache configuration for a specific key.
 */
export type CachePrefix = keyof CacheConfiguration;

/**
 * The root cache key is used to store the root cache entry. This is used to
 * store the root cache entry for a specific cache prefix - useful when
 * there's no specific key to store the cache entry under.
 */
export const rootCacheKey = "root";
/**
 * The cache prefixes are an array of all cache prefixes that are used in the
 * client. These are used to determine the cache configuration for a specific
 * cache key.
 */
export const cachePrefixes: CachePrefix[] = Object.keys(
	defaultCacheConfiguration,
) as CachePrefix[];

/**
 * The options to instantiate a new CFTools client with. The client options
 * can be used to configure the client with a custom logger and cache
 * configuration.
 */
export type ClientOptions = {
	/**
	 * The logger to use for the client. If not provided, a new  logger
	 * will be created and used that only logs entries of level ERROR and higher.
	 */
	logger?: AbstractLogger;
	/**
	 * The cache configuration to use for the client. If not provided, the default
	 * cache configuration will be used. See {@link defaultCacheConfiguration}.
	 */
	cacheConfiguration?: Partial<CacheConfiguration> & {
		enabled?: boolean;
	};
	/**
	 * The amount of time (in ms) that has to pass before requests are considered
	 * timed out, and aborted.
	 */
	requestTimeout?: number;
	/**
	 * Should the Account Creation API be used? Explicit permission needs to be
	 * obtained from the CFTools team to use this API. When enabled, the client
	 * will create user accounts for identities that have never connected to
	 * cftools-enabled servers.
	 */
	useAccountCreationAPI?: boolean;
};

/**
 * The entry point for this library. The CFTools client is used to interact with
 * the CFTools Data API and provides methods to perform various actions such as
 * looking up users, listing bans, and sending messages to players.
 * See {@link https://developer.cftools.cloud/documentation/data-api} for more
 * information on the CFTools Data API.
 */
export class CFToolsClient {
	/**
	 * The logger used by the client to log messages.
	 */
	public logger: AbstractLogger;
	/**
	 * The authentication provider used by the client to authenticate with the CFTools Data API.
	 */
	public authProvider: Authentication;
	/**
	 * The request client used by the client to make requests to the CFTools Data API.
	 */
	public requestClient: RequestClient;
	/**
	 * The cache manager used by the client to cache responses from the CFTools Data API.
	 */
	public cacheManager: CacheManager;
	/**
	 * The cache configuration in use by the client.
	 */
	public cacheConfiguration: CacheConfiguration = defaultCacheConfiguration;
	/**
	 * Whether caching is enabled for the client.
	 */
	public cachingEnabled = true;
	/**
	 * Whether the account creation API is enabled for the client.
	 * @see {@link ClientOptions.useAccountCreationAPI}
	 */
	public useAccountCreationAPI = false;

	constructor(
		/**
		 * The tokens/data used to authenticate with the CFTools Data API.
		 */
		clientAuth: ClientAuthenticationData,
		/**
		 * Additional options to configure the client.
		 */
		options?: ClientOptions,
	) {
		const { logger, cacheConfiguration } = options ?? {
			logger: undefined,
			cacheConfiguration: {},
		};
		this.logger = logger ?? new ConsoleLogger();
		this.authProvider = new Authentication(
			this,
			clientAuth,
			this.logger.extend("Authentication"),
		);
		this.requestClient = new RequestClient(
			this.authProvider,
			this.logger.extend("RequestClient"),
			options?.requestTimeout,
		);
		this.cacheManager = CacheManager.getInstance();
		this.cachingEnabled = cacheConfiguration?.enabled ?? true;
		delete cacheConfiguration?.enabled;
		this.cacheConfiguration = {
			...defaultCacheConfiguration,
			...cacheConfiguration,
		};
		this.useAccountCreationAPI = options?.useAccountCreationAPI ?? false;
	}

	private cacheTTL(prefix: CachePrefix): number {
		return this.cacheConfiguration[prefix][0] * UnitConstants.MS_IN_ONE_S;
	}

	private cacheMaxSize(prefix: CachePrefix): number {
		return this.cacheConfiguration[prefix][1];
	}

	private async cacheGet<T>(
		prefix: CachePrefix,
		key: string,
	): Promise<T | null> {
		const resolvedKey = `${prefix}:${key}`;
		const data = this.cachingEnabled
			? await this.cacheManager.get<T>(resolvedKey)
			: null;

		this.logger.debug("Cache get", resolvedKey, data);

		return data;
	}

	private async cacheSet<T>(
		prefix: CachePrefix,
		key: string,
		value: T,
	): Promise<void> {
		if (this.cachingEnabled) {
			const resolvedKey = `${prefix}:${key}`;
			const ttl = this.cacheTTL(prefix);
			const maxSize = this.cacheMaxSize(prefix);

			await this.cacheManager.set<T>(resolvedKey, value, ttl);
			await this.cacheManager.enforceMaxSizeForPrefix(prefix, maxSize);

			this.logger.debug(
				"Cache set",
				`${resolvedKey} (${ttl}ms, ${maxSize} max)`,
				value,
			);
		}
	}

	/**
	 * @returns The URL to grant access to the CFTools Data API.
	 */
	public grantURL(): string {
		return `${CFTOOLS_BASE_URL}/authorize/${this.authProvider.applicationId}`;
	}

	/**
	 * Resolves the server ID from the provided options.
	 * @param options The options to resolve the server ID from.
	 * @returns The resolved server ID.
	 */
	public resolveServerId(options: string | ResolveServerIdOptions): string {
		return resolveServerId(options);
	}

	/**
	 * Resolves the dynamic player ID to a CFTools ID. This id can be a string,
	 * or {@link AnyPlayerId}.
	 * @param options The options to resolve the dynamic player ID from.
	 * @returns The resolved CFTools ID.
	 */
	public async resolveDynamicPlayerId(options: {
		playerId: string | AnyPlayerId;
	}): Promise<string> {
		return typeof options.playerId === "string" && isCFToolsId(options.playerId)
			? options.playerId
			: (await this.lookupUser(options.playerId)).cftoolsId;
	}

	/**
	 * Resolves `target` input to a steam64, used in GameLabs actions (`referenceKey`).
	 * `target` can be multiple different things, please see {@link GameLabsActionTarget}.
	 * @param options The options to resolve the player reference key from.
	 * @returns The resolved player reference key.
	 */
	public async resolvePlayerReferenceKey(options: {
		target: GameLabsActionTarget;
		serverApiId?: string;
	}): Promise<string | null> {
		const { target, serverApiId } = options;

		if (typeof target === "object" && "gamedata" in target) {
			return target.gamedata.steam64;
		}

		const session = await this.getSessionByPlayerId({
			playerId: target,
			serverApiId: serverApiId,
		});

		return session?.gamedata.steam64 ?? null;
	}

	/**
	 * Authenticates with the CFTools Data API and returns the authentication token.
	 * @returns The client authentication token.
	 * @see {`/v1/auth/register`} for more information.
	 */
	public async authenticate(): Promise<ClientAuthentication> {
		if (!this.authProvider.shouldRefresh()) {
			return this.authProvider.currentToken();
		}

		const response = await this.requestClient.post<AuthenticationResponse>(
			this.requestClient.apiUrl(API_VERSION.V1, "/auth/register"),
			this.authProvider.getAuthenticationBody(),
			true,
		);

		const resolvedValidFor = response.valid_for
			? response.valid_for * UnitConstants.MS_IN_ONE_S
			: AUTHENTICATION_TOKEN_REFRESH_INTERVAL;

		const clientResponse: ClientAuthentication = {
			issuedAt: new Date(),
			expiresAt: new Date(Date.now() + resolvedValidFor),
			token: response.token,
		};

		this.logger.debug(
			"Successfully authenticated with CFTools Data API",
			clientResponse,
		);

		this.authProvider.authenticated = true;
		this.authProvider.issuedAt = clientResponse.issuedAt;
		this.authProvider.expiresAt = clientResponse.expiresAt;
		this.authProvider.authenticationToken = clientResponse.token;

		return clientResponse;
	}

	/**
	 * Resolves the current client grants. A grant represents a resource (server or banlist)
	 * that the client has access to. The client grants are used to determine what actions
	 * the client can perform.
	 * @returns The current client grants.
	 * @see {`/v1/@app/grants`} for more information.
	 */
	public async getAppGrants(): Promise<ClientGrantsResponse> {
		const cachePrefix = "appGrants";
		const cachedResponse = await this.cacheGet<ClientGrantsResponse>(
			cachePrefix,
			rootCacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached app grants", cachedResponse);
			return cachedResponse;
		}

		const response = await this.requestClient.get<GrantsResponse>(
			this.requestClient.apiUrl(API_VERSION.V1, "/@app/grants"),
		);

		const transformedResponse = transformGrantResponse(response);

		this.cacheSet(cachePrefix, rootCacheKey, transformedResponse);
		this.logger.debug("Transformed app grants", response, transformedResponse);

		return transformedResponse;
	}

	/**
	 * Fetch game-server details from the CFTools Data API. This references
	 * game-server entities, and is NOT the scope which allows you to retrieve
	 * information about CFCloud instances.
	 * @param options The options to fetch game-server details with.
	 * @returns The game-server details.
	 * @see {`/v1/gameserver/{server_id}`} for more information.
	 */
	public async gameServerDetails(
		options: string | ResolveServerIdOptions,
	): Promise<ClientGameServerResponse> {
		const cachePrefix = "gameServerDetails";
		const cacheKey = CacheManager.hashKeyFromObject(options);
		const cachedResponse = await this.cacheGet<ClientGameServerResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached game server details", cachedResponse);
			return cachedResponse;
		}

		const serverId = this.resolveServerId(options);
		const response = await this.requestClient.get<GameServerResponse>(
			this.requestClient.apiUrl(API_VERSION.V1, `/gameserver/${serverId}`),
		);

		const transformedResponse = transformGameServerDetails(response, serverId);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed game server details",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Resolves a string or {@link AnyPlayerId} to a CFTools ID.
	 * @param id The ID to lookup.
	 * @returns The resolved CFTools ID.
	 * @see {`/v1/users/lookup`} for more information.
	 */
	public async lookupUser(
		id: string | AnyPlayerId,
		/**
		 * Whether the Account Creation API should be used.
		 * @see {@link ClientOptions.useAccountCreationAPI}
		 */
		useAccountCreationAPI = this.useAccountCreationAPI,
	): Promise<ClientLookupUserResponse> {
		const cachePrefix = "userLookup";
		const cacheKey = CacheManager.hashKeyFromObject(id);
		const cachedResponse = await this.cacheGet<ClientLookupUserResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached user lookup", cachedResponse);
			return cachedResponse;
		}

		const resolvedId = typeof id === "string" ? id : id.getRawId();
		const usesAccountCreationAPI =
			useAccountCreationAPI && isSteam64(resolvedId);

		if (isCFToolsId(resolvedId)) {
			return {
				cftoolsId: resolvedId,
			};
		}

		let response: LookupUserResponse;
		try {
			response = await this.requestClient.get<LookupUserResponse>(
				this.requestClient.apiUrl(API_VERSION.V1, "/users/lookup", {
					identifier: resolvedId,
				}),
			);
		} catch (error) {
			if (isNotFoundError(error) && usesAccountCreationAPI) {
				response = await this.requestClient.get<LookupUserResponse>(
					this.requestClient.apiUrl(API_VERSION.V1, "/users/lookup", {
						identifier: resolvedId,
						create: "true",
					}),
				);
			} else {
				throw error;
			}
		}

		const transformedResponse: ClientLookupUserResponse = {
			cftoolsId: response.cftools_id,
			notice: response.notice,
		};

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug("Successfully looked up user", response);

		return transformedResponse;
	}

	/**
	 * Fetches bans from a banlist. The `filter` parameter can be a comment,
	 * CFTools ID or an IPv4 address. If the `filter` parameter is a string, it will
	 * be ignored in the request. If the `filter` parameter is an {@link AnyPlayerId},
	 * it will be resolved to a CFTools ID before being used in the request.
	 * @param options The options to list bans with.
	 * @returns The list of bans.
	 * @see {`/v1/banlist/{banlist_id}/bans`} for more information.
	 */
	public async listBans(
		options: ListBansOptions,
	): Promise<ClientListBansResponse> {
		const cachePrefix = "listBans";
		const cacheKey = CacheManager.hashKeyFromObject(options);
		const cachedResponse = await this.cacheGet<ClientListBansResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached ban list", cachedResponse);
			return cachedResponse;
		}

		const { banListId, filter } = options;
		const resolvedFilterId =
			typeof filter === "string" ? filter : filter?.getRawId();
		const resolvedFilter =
			typeof resolvedFilterId === "string"
				? isIPv4(resolvedFilterId)
					? resolvedFilterId
					: (await this.lookupUser(resolvedFilterId)).cftoolsId
				: resolvedFilterId;

		const params = resolvedFilter
			? new URLSearchParams({ filter: resolvedFilter })
			: undefined;
		const response = await this.requestClient.get<ListBansResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/banlist/${banListId}/bans`,
				params,
			),
		);

		const transformedResponse = transformBanListResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug("Transformed ban list", response, transformedResponse);

		return transformedResponse;
	}

	/**
	 * Creates a ban on a banlist. The `identifier` parameter can be a CFTools ID
	 * or an IPv4 address. If the `identifier` parameter is an {@link AnyPlayerId},
	 * it will be resolved to a CFTools ID before being used in the request.
	 * @param options The options to create a ban with.
	 * @throws {MaxLengthExceededError} Thrown if the ban reason exceeds 128 characters.
	 * @see {`/v1/banlist/{banlist_id}/bans`} for more information.
	 */
	public async createBan(options: CreateBanOptions): Promise<void> {
		const resolvedIdentifier =
			options.format === "ipv4"
				? options.identifier
				: (await this.lookupUser(options.identifier)).cftoolsId;

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/banlist/${options.banListId}/bans`,
			),
			{
				format: options.format,
				identifier: resolvedIdentifier,
				expires_at:
					options.expires === "PERMANENT"
						? "PERMANENT"
						: options.expires.toISOString(),
				reason: options.reason,
			},
		);

		await this.cacheManager.clearPrefixEntries("listBans");

		this.logger.debug("Successfully created ban", response);
	}

	/**
	 * Deletes a ban from a banlist.
	 * @param options The options to delete a ban with.
	 * @throws {NotFoundError} Thrown if the ban being deleted does not exist.
	 * @throws {InvalidOptionError} Thrown if the ban ID is not provided.
	 * @see {`/v1/banlist/{banlist_id}/bans`} for more information.
	 */
	public async deleteBan(options: DeleteBanOptions): Promise<void> {
		const response = await this.requestClient.delete(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/banlist/${options.banListId}/bans`,
				{
					ban_id: options.banId,
				},
			),
		);

		await this.cacheManager.clearPrefixEntries("listBans");

		this.logger.debug("Successfully deleted ban", response);
	}

	/**
	 * Fetches server information from the CFTools Data API. This includes
	 * information about the server such as the name, description, and more.
	 * @param serverApiId The server API ID to fetch information for.
	 * @returns The server information.
	 * @throws {NotFoundError} Thrown if the server is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/info`} for more information.
	 */
	public async serverInfo(
		serverApiId?: string,
	): Promise<ClientServerInfoResponse> {
		const cachePrefix = "serverInfo";
		const cacheKey = CacheManager.hashKeyFromObject(serverApiId);
		const cachedResponse = await this.cacheGet<ClientServerInfoResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached server info", cachedResponse);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);
		const response = await this.requestClient.get<ServerInfoResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/info`,
			),
		);

		const transformedResponse = transformServerInfoResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug("Transformed server info", response, transformedResponse);

		return transformedResponse;
	}

	/**
	 * Fetches server statistics from the CFTools Data API. This includes
	 * statistics about the server such as the player count, uptime, and more.
	 * @param serverApiId The server API ID to fetch statistics for.
	 * @returns The server statistics.
	 * @throws {NotFoundError} Thrown if the server is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/statistics`} for more information.
	 */
	public async serverStatistics(
		serverApiId?: string,
	): Promise<ClientServerStatisticsResponse> {
		const cachePrefix = "serverStatistics";
		const cacheKey = CacheManager.hashKeyFromObject(serverApiId);
		const cachedResponse = await this.cacheGet<ClientServerStatisticsResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached server statistics", cachedResponse);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);
		const response = await this.requestClient.get<ServerStatisticsResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/statistics`,
			),
		);

		const transformedResponse = transformServerStatisticsResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed server statistics",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Fetches the player list from the CFTools Data API. This list consists of
	 * all players currently connected to the server.
	 * @param serverApiId The server API ID to fetch the player list for.
	 * @returns The player list.
	 * @throws {NotFoundError} Thrown if the server is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/GSM/list`} for more information.
	 */
	public async playerList(
		serverApiId?: string,
	): Promise<ClientPlayerListResponse> {
		const cachePrefix = "playerList";
		const cacheKey = CacheManager.hashKeyFromObject(serverApiId);
		const cachedResponse = await this.cacheGet<ClientPlayerListResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached player list", cachedResponse);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);
		const response = await this.requestClient.get<PlayerListResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/GSM/list`,
			),
		);

		const transformedResponse = transformPlayerListResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug("Transformed player list", response, transformedResponse);

		return transformedResponse;
	}

	/**
	 * Fetches a session by a player ID. This can be a CFTools ID or a dynamic
	 * player ID. If the player ID is a dynamic player ID, it will be resolved
	 * to a CFTools ID before being used in the request.
	 * @param options The options to fetch a session by player ID with.
	 * @returns The player session.
	 * @throws {NotFoundError} Thrown if the player session is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/GSM/list`} for more information.
	 */
	public async getSessionByPlayerId(
		options: GetSessionByCFToolsIdOptions,
	): Promise<ClientPlayerListResponse[0] | null> {
		const [playerList, resolvedId] = await Promise.all([
			this.playerList(options.serverApiId),
			typeof options.playerId === "string" && isCFToolsId(options.playerId)
				? options.playerId
				: (await this.lookupUser(options.playerId)).cftoolsId,
		]);
		const session = playerList.find(
			(player) => player.cftoolsId === resolvedId,
		);

		return session ?? null;
	}

	/**
	 * Kicks a player that is currently connected to the server. The `id` parameter
	 * can be a CFTools ID, a dynamic player ID, or a session id. If the `id` parameter
	 * is a dynamic player ID, it will be resolved to a CFTools ID before being used
	 * in the request.
	 * @param options The options to kick a player with.
	 * @throws {NotFoundError} Thrown if the player being kicked is not found.
	 * @throws {MaxLengthExceededError} Thrown if the kick reason exceeds 128 characters.
	 * @see {`/v1/server/{server_id}/kick`} for more information.
	 */
	public async kickPlayer(options: KickOptions): Promise<void> {
		const resolvedSessionId =
			typeof options.id === "string"
				? options.id
				: (
						await this.getSessionByPlayerId({
							playerId: options.id,
							serverApiId: options.serverApiId,
						})
					)?.id;

		if (!resolvedSessionId) {
			throw new NotFoundError(null, "Player session not found");
		}

		if (options.reason.length > 128) {
			throw new MaxLengthExceededError(
				null,
				"Kick reason must be less than 128 characters",
			);
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/kick`,
			),
			{
				gamesession_id: resolvedSessionId,
				reason: options.reason,
			},
		);

		this.logger.debug("Successfully kicked player", response);
	}

	/**
	 * Privately messages a player that is currently connected to the server. The `id`
	 * parameter can be a CFTools ID, a dynamic player ID, or a session id. If the `id`
	 * parameter is a dynamic player ID, it will be resolved to a CFTools ID before being
	 * used in the request.
	 * @param options The options to message a player with.
	 * @throws {NotFoundError} Thrown if the player being messaged is not found.
	 * @throws {MaxLengthExceededError} Thrown if the private message content exceeds 256 characters.
	 * @see {`/v1/server/{server_id}/message-private`} for more information.
	 */
	public async messagePrivate(options: MessagePrivateOptions): Promise<void> {
		const resolvedSessionId =
			typeof options.id === "string"
				? options.id
				: (
						await this.getSessionByPlayerId({
							playerId: options.id,
							serverApiId: options.serverApiId,
						})
					)?.id;

		if (!resolvedSessionId) {
			throw new NotFoundError(null, "Player session not found");
		}

		if (options.content.length > 256) {
			throw new MaxLengthExceededError(
				null,
				"Private message content must be less than 256 characters",
			);
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/message-private`,
			),
			{
				gamesession_id: resolvedSessionId,
				content: options.content,
			},
		);

		this.logger.debug("Successfully sent private message", response);
	}

	/**
	 * Broadcast a message to all players currently connected to the server.
	 * @param options The options to message all players with.
	 * @throws {MaxLengthExceededError} Thrown if the server message content exceeds 256 characters.
	 * @see {`/v1/server/{server_id}/message-server`} for more information.
	 */
	public async messageServer(options: MessageServerOptions): Promise<void> {
		if (options.content.length > 256) {
			throw new MaxLengthExceededError(
				null,
				"Server message content must be less than 256 characters",
			);
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/message-server`,
			),
			{
				content: options.content,
			},
		);

		this.logger.debug("Successfully sent server message", response);
	}

	/**
	 * Issue an RCon command to the server.
	 * @param options The options to issue an RCon command with.
	 * @throws {MaxLengthExceededError} Thrown if the RCon command exceeds 256 characters.
	 * @see {`/v1/server/{server_id}/raw`} for more information.
	 * @see {@link https://www.4netplayers.com/en/wiki/dayz/admin-commands/} for a list of admin commands.
	 */
	public async rconCommand(options: RawRConCommandOptions): Promise<void> {
		if (options.command.length > 256) {
			throw new MaxLengthExceededError(
				null,
				"RCon command must be less than 256 characters",
			);
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/raw`,
			),
			{
				command: options.command,
			},
		);

		this.logger.debug("Successfully sent RCon command", response);
	}

	/**
	 * Fetches all currently available GameLabs actions. This list will be
	 * empty if the GameLabs mod is not installed on the server.
	 * @param serverApiId The server API ID to fetch GameLabs actions for.
	 * @returns The GameLabs actions.
	 * @throws {NotFoundError} Thrown if the server is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/GameLabs/actions`} for more information.
	 * @see {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692} for the GameLabs mod.
	 */
	public async gameLabsActions(
		serverApiId?: string,
	): Promise<ClientGameLabsActionsResponse> {
		const cachePrefix = "gameLabsActions";
		const cacheKey = CacheManager.hashKeyFromObject(serverApiId);
		const cachedResponse = await this.cacheGet<ClientGameLabsActionsResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached GameLabs actions", cachedResponse);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);
		const response = await this.requestClient.get<GameLabsActionsResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/GameLabs/actions`,
			),
		);

		const transformedResponse = transformGameLabsActionsResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed GameLabs actions",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Fetches all dynamic entity events from the GameLabs mod. This list will
	 * be empty if the GameLabs mod is not installed on the server.
	 * @param serverApiId The server API ID to fetch GameLabs entity events for.
	 * @returns The GameLabs entity events.
	 * @throws {NotFoundError} Thrown if the server is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/GameLabs/entities/events`} for more information.
	 * @see {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692} for the GameLabs mod.
	 */
	public async gameLabsEntityEvents(
		serverApiId?: string,
	): Promise<ClientGameLabsEntityEventsResponse> {
		const cachePrefix = "gameLabsEntityEvents";
		const cacheKey = CacheManager.hashKeyFromObject(serverApiId);
		const cachedResponse =
			await this.cacheGet<ClientGameLabsEntityEventsResponse>(
				cachePrefix,
				cacheKey,
			);

		if (cachedResponse) {
			this.logger.debug(
				"Returning cached GameLabs entity events",
				cachedResponse,
			);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);
		const response = await this.requestClient.get<GameLabsEntityEventsResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/GameLabs/entities/events`,
			),
		);

		const transformedResponse = transformGameLabsEntityEventsResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed GameLabs entity events",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Fetches all dynamic entity vehicles from the GameLabs mod. This list will
	 * be empty if the GameLabs mod is not installed on the server.
	 * @param serverApiId The server API ID to fetch GameLabs entity vehicles for.
	 * @returns The GameLabs entity vehicles.
	 * @throws {NotFoundError} Thrown if the server is not found.
	 * @throws {MissingServerApiIdError} Thrown if the server API ID is not provided.
	 * @see {`/v1/server/{server_id}/GameLabs/entities/vehicles`} for more information.
	 * @see {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692} for the GameLabs mod.
	 */
	public async gameLabsEntityVehicles(
		serverApiId?: string,
	): Promise<ClientGameLabsEntityVehiclesResponse> {
		const cachePrefix = "gameLabsEntityVehicles";
		const cacheKey = CacheManager.hashKeyFromObject(serverApiId);
		const cachedResponse =
			await this.cacheGet<ClientGameLabsEntityVehiclesResponse>(
				cachePrefix,
				cacheKey,
			);

		if (cachedResponse) {
			this.logger.debug(
				"Returning cached GameLabs entity vehicles",
				cachedResponse,
			);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);
		const response =
			await this.requestClient.get<GameLabsEntityVehiclesResponse>(
				this.requestClient.apiUrl(
					API_VERSION.V1,
					`/server/${resolvedServerApiId}/GameLabs/entities/vehicles`,
				),
			);

		const transformedResponse =
			transformGameLabsEntityVehiclesResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed GameLabs entity vehicles",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Perform a specified GameLabs action. The GameLabs mod is required to be
	 * installed on the server for these actions to work. This counts for any
	 * GameLabs action, including teleporting players, spawning items, and more.
	 * @param options The options to post a GameLabs action with.
	 * @throws {NotFoundError} Thrown if the player on which the action is performed is not online.
	 * @see {`/v1/server/{server_id}/GameLabs/action`} for more information.
	 */
	public async postGameLabsAction(
		options: PostGameLabsActionOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/GameLabs/action`,
			),
			{
				actionCode: options.actionCode,
				actionContext: options.actionContext,
				referenceKey: options.referenceKey,
				parameters: options.parameters ?? {},
			},
		);

		this.logger.debug("Successfully posted GameLabs action", response);
	}

	/**
	 * Perform multiple GameLabs actions in a single request. The GameLabs mod
	 * is required to be installed on the server for these actions to work. This
	 * counts for any GameLabs action, including teleporting players, spawning items, and more.
	 * @param options The options to batch post GameLabs actions with.
	 * @throws {MinLengthNotReachedError} Thrown if the batch actions have less than one action.
	 * @throws {MaxLengthExceededError} Thrown if the batch actions have more than ten actions.
	 * @see {`/v1/server/{server_id}/GameLabs/batch-actions`} for more information.
	 * @see {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692} for the GameLabs mod.
	 */
	public async batchPostGameLabsAction(
		options: BatchPostGameLabsActionOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		if (options.actions.length === 0) {
			throw new MinLengthNotReachedError(
				null,
				"Batch actions must have at least one action",
			);
		}

		if (options.actions.length > 10) {
			throw new MaxLengthExceededError(
				null,
				"Batch actions must be less than 10",
			);
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/GameLabs/batch-actions`,
			),
			{
				actions: options.actions,
			},
		);

		this.logger.debug("Successfully batch posted GameLabs actions", response);
	}

	/**
	 * Teleport a player to a specified position.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The `position` parameter is an array of three numbers, representing the
	 * x, y, and z coordinates respectively.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to teleport a player with.
	 * @throws {NotFoundError} Thrown if the player being teleported is not online.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async teleportPlayer(options: TeleportPlayerOptions): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_TeleportPlayer,
			actionContext: "player",
			referenceKey: steam64,
			parameters: {
				vector: {
					dataType: "vector",
					valueVectorX: options.position[0],
					valueVectorY: options.position[1],
					valueVectorZ: options.position[2],
				},
			},
		});

		this.logger.debug("Successfully teleported player", response);
	}

	/**
	 * Heal a player to full health.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to heal a player with.
	 * @throws {NotFoundError} Thrown if the player being healed is not online.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async healPlayer(options: TargetActionOptionsNoParams): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_HealPlayer,
			actionContext: "player",
			referenceKey: steam64,
		});

		this.logger.debug("Successfully healed player", response);
	}

	/**
	 * Kill a player that is currently connected to the server.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to kill a player with.
	 * @throws {NotFoundError} Thrown if the player being killed is not online.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async killPlayer(options: TargetActionOptionsNoParams): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_KillPlayer,
			actionContext: "player",
			referenceKey: steam64,
		});

		this.logger.debug("Successfully killed player", response);
	}

	/**
	 * Spawn an item on a player that is currently connected to the server.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * - The `itemClassName` parameter is the class name of the item to spawn.
	 * - The `quantity` parameter is the amount of items to spawn.
	 * - The `stacked` parameter is a boolean that determines if the items should be stacked.
	 * - The `populateItem` parameter is a boolean that determines if the item should be populated.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to spawn an item on a player with.
	 * @throws {NotFoundError} Thrown if the player on which the item is spawned is not online.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async spawnItemOnPlayer(
		options: SpawnItemOnPlayerOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_SpawnPlayerItem,
			actionContext: "player",
			referenceKey: steam64,
			parameters: {
				item: {
					dataType: "cf_itemlist",
					valueString: options.itemClassName,
				},
				debug: {
					dataType: "boolean",
					valueBool: options.populateItem ?? false,
				},
				quantity: {
					dataType: "int",
					valueInt: options.quantity ?? 1,
				},
				stacked: {
					dataType: "boolean",
					valueBool: options.stacked ?? false,
				},
			},
		});

		this.logger.debug("Successfully spawned item on player", response);
	}

	/**
	 * Strip a player of all items that they currently have.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to strip a player with.
	 * @throws {NotFoundError} Thrown if the player being stripped is not online.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async stripPlayer(
		options: TargetActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_StripPlayer,
			actionContext: "player",
			referenceKey: steam64,
		});

		this.logger.debug("Successfully stripped player", response);
	}

	/**
	 * Explode a player that is currently connected to the server.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to explode a player with.
	 * @throws {NotFoundError} Thrown if the player being exploded is not online.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async explodePlayer(
		options: TargetActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_ExplodePlayer,
			actionContext: "player",
			referenceKey: steam64,
		});

		this.logger.debug("Successfully exploded player", response);
	}

	/**
	 * Delete a vehicle that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the vehicle to delete.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to delete a vehicle with.
	 * @throws {NotFoundError} Thrown if the vehicle is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async deleteVehicle(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_DeleteVehicle,
			actionContext: "vehicle",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully deleted player vehicle", response);
	}

	/**
	 * Kills the engine of a vehicle that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the vehicle to kill the engine of.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to kill the vehicle engine with.
	 * @throws {NotFoundError} Thrown if the vehicle is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async killVehicleEngine(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_KillVehicleEngine,
			actionContext: "vehicle",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully killed vehicle engine", response);
	}

	/**
	 * Refuel a vehicle that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the vehicle to refuel.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to refuel a vehicle with.
	 * @throws {NotFoundError} Thrown if the vehicle is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async refuelVehicle(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_RefuelVehicle,
			actionContext: "vehicle",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully refueled vehicle", response);
	}

	/**
	 * Repair a vehicle that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the vehicle to repair.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to repair a vehicle with.
	 * @throws {NotFoundError} Thrown if the vehicle is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async repairVehicle(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_RepairVehicle,
			actionContext: "vehicle",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully repaired vehicle", response);
	}

	/**
	 * Explode a vehicle that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the vehicle to explode.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to explode
	 * @throws {NotFoundError} Thrown if the vehicle is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async explodeVehicle(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_VehicleExplode,
			actionContext: "vehicle",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully exploded vehicle", response);
	}

	/**
	 * Unstuck a vehicle that is currently spawned on the server. This action
	 * will move the vehicle by a couple of x, and z coordinates to get it unstuck.
	 *
	 * The `identifier` parameter is the entity ID of the vehicle to unstuck.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to unstuck a vehicle with.
	 * @throws {NotFoundError} Thrown if the vehicle is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async unstuckVehicle(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_UnstuckVehicle,
			actionContext: "vehicle",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully unstuck vehicle", response);
	}

	/**
	 * Set the current time of the world on the server.
	 *
	 * The `hour` parameter is the hour of the day to set the world time to.
	 * The `minute` parameter is the minute of the hour to set the world time to.
	 *
	 * The hour must be between 0 and 24, and the minute must be between 0 and 60.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to change the world time with.
	 * @throws {LengthMismatchError} Thrown if the world time hour or minute is out of bounds.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async changeWorldTime(options: ChangeWorldTimeOptions): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		if (options.hour < 0 || options.hour > 24) {
			throw new LengthMismatchError(
				null,
				"World time hour must be between 0 and 24",
			);
		}

		if (options.minute < 0 || options.minute > 60) {
			throw new LengthMismatchError(
				null,
				"World time minute must be between 0 and 60",
			);
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_WorldTime,
			actionContext: "world",
			referenceKey: null,
			parameters: {
				hour: {
					dataType: "int",
					valueInt: options.hour,
				},
				minute: {
					dataType: "int",
					valueInt: options.minute,
				},
			},
		});

		this.logger.debug("Successfully changed world time", response);
	}

	/**
	 * Set the current weather of the world on the server.
	 *
	 * - The `fogDensity` parameter is a float between 0 and 1, representing the fog density.
	 * - The `overcast` parameter is a float between 0 and 1, representing the overcast.
	 * - The `rainIntensity` parameter is a float between 0 and 1, representing the rain intensity.
	 * - The `windIntensity` parameter is an integer greater than 0, representing the wind intensity.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to change the world weather with.
	 * @throws {InvalidOptionError} Thrown if the world weather options are out of bounds.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async changeWorldWeather(
		options: ChangeWorldWeatherOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		if (options.fogDensity < 0 || options.fogDensity > 1) {
			throw new InvalidOptionError(
				null,
				"World weather fog density must be between 0 and 1",
			);
		}

		if (options.overcast < 0 || options.overcast > 1) {
			throw new InvalidOptionError(
				null,
				"World weather overcast must be between 0 and 1",
			);
		}

		if (options.rainIntensity < 0 || options.rainIntensity > 1) {
			throw new InvalidOptionError(
				null,
				"World weather rain intensity must be between 0 and 1",
			);
		}

		if (options.windIntensity < 0) {
			throw new InvalidOptionError(
				null,
				"World weather wind intensity must be greater than 0",
			);
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_WorldWeather,
			actionContext: "world",
			referenceKey: null,
			parameters: {
				fog: {
					dataType: "float",
					valueFloat: options.fogDensity,
				},
				overcast: {
					dataType: "float",
					valueFloat: options.overcast,
				},
				rain: {
					dataType: "float",
					valueFloat: options.rainIntensity,
				},
				wind: {
					dataType: "int",
					valueFloat: options.windIntensity,
				},
			},
		});

		this.logger.debug("Successfully changed world weather", response);
	}

	/**
	 * Change the world weather to sunny/clear on the server.
	 * @param serverApiId The server API ID to change the world weather on.
	 * @see {@link postGameLabsAction} for more information on GameLabs actions.
	 * @see {@link changeWorldWeather} for more information on the specific action to change the world weather.
	 */
	public async setWorldWeatherSunny(serverApiId?: string): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_WorldWeatherSunny,
			actionContext: "world",
			referenceKey: null,
		});

		this.logger.debug(
			"Successfully set world weather to sunny/clear",
			response,
		);
	}

	/**
	 * Wipe all AI from the world on the server. This deletes all AI entities
	 * from the world, including zombies, animals, and more.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param serverApiId The server API ID to wipe world AI on.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async wipeWorldAI(serverApiId?: string): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_WorldWipeAI,
			actionContext: "world",
			referenceKey: null,
		});

		this.logger.debug("Successfully wiped world AI", response);
	}

	/**
	 * Wipe all vehicles from the world on the server. This deletes all vehicle
	 * entities from the world, including cars, boats, helicopters, and more.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param serverApiId The server API ID to wipe world vehicles on.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async wipeWorldVehicles(serverApiId?: string): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_WorldWipeVehicles,
			actionContext: "world",
			referenceKey: null,
		});

		this.logger.debug("Successfully wiped world vehicles", response);
	}

	/**
	 * Spawn on item on a set of [x, y, z] coordinates on the ground.
	 *
	 * - The `itemClassName` parameter is the class name of the item to spawn.
	 * - The `position` parameter is an array of three numbers, representing the
	 *  x, y, and z coordinates respectively.
	 * - The `quantity` parameter is the amount of items to spawn.
	 * - The `stacked` parameter is a boolean that determines if the items should be stacked.
	 * - The `populateItem` parameter is a boolean that determines if the item should be populated.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to spawn an item on the ground with.
	 * @throws {LengthMismatchError} Thrown if the item spawn position is not an array of three numbers.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async spawnItemOnGround(
		options: SpawnItemOnGroundOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		if (options.position.length !== 3) {
			throw new LengthMismatchError(
				null,
				"Item spawn position must be an array of 3 numbers",
			);
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_SpawnItemWorld,
			actionContext: "world",
			referenceKey: null,
			parameters: {
				item: {
					dataType: "cf_itemlist",
					valueString: options.itemClassName,
				},
				debug: {
					dataType: "boolean",
					valueBool: options.populateItem ?? false,
				},
				quantity: {
					dataType: "int",
					valueInt: options.quantity ?? 1,
				},
				stacked: {
					dataType: "boolean",
					valueBool: options.stacked ?? false,
				},
				vector: {
					dataType: "vector",
					valueVectorX: options.position[0],
					valueVectorY: options.position[1],
					valueVectorZ: options.position[2],
				},
			},
		});

		this.logger.debug("Successfully spawned item on ground", response);
	}

	/**
	 * Delete an object that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the object to delete.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to delete an object with.
	 * @throws {NotFoundError} Thrown if the object is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async deleteObject(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_ObjectDelete,
			actionContext: "object",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully deleted object", response);
	}

	/**
	 * Clear the territory flag of a territory that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the territory flag to clear.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to clear a territory flag with.
	 * @throws {NotFoundError} Thrown if the territory flag is not found.
	 * @see {@link postGameLabsAction} for more information.
	 */
	public async clearTerritory(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.CFCloud_TerritoryFlagClear,
			actionContext: "object",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully cleared territory", response);
	}

	/**
	 * Flip a transport that is currently spawned on the server.
	 *
	 * The `identifier` parameter is the entity ID of the transport to flip.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=1832448183 FlipTransport}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to flip a transport with.
	 * @throws {NotFoundError} Thrown if the transport is not found.
	 * @see {@link postGameLabsAction} for more information.
	 * @see {@link wrdgPushTransport} for more information on pushing a transport.
	 */
	public async wrdgFlipTransport(
		options: IdentifierActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.WRDG_FlipTransport_GL,
			actionContext: "world",
			referenceKey: options.identifier,
		});

		this.logger.debug("Successfully flipped transport (WRDG)", response);
	}

	/**
	 * This action will push a transport that is currently spawned on the server.
	 *
	 * - The `identifier` parameter is the entity ID of the transport to push.
	 * - The `reverse` parameter is a boolean that determines if the transport should be pushed in reverse.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=1832448183 PushTransport}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to push a transport with.
	 * @throws {NotFoundError} Thrown if the transport is not found.
	 * @see {@link postGameLabsAction} for more information.
	 * @see {@link wrdgFlipTransport} for more information on flipping a transport.
	 */
	public async wrdgPushTransport(
		options: WrdgPushTransportOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.WRDG_PushTransport_GL,
			actionContext: "world",
			referenceKey: options.identifier,
			parameters: {
				reverse: {
					dataType: "boolean",
					valueBool: options.reverse ?? false,
				},
			},
		});

		this.logger.debug("Successfully pushed transport (WRDG)", response);
	}

	/**
	 * This action will mute a player that is currently connected to the server.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The `durationInMinutes` parameter is the amount of time in minutes to mute the player for.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 *
	 * The mod {@link https://lbmaster.de/product.php?id=4 Advanced Groups}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to mute a player with.
	 * @throws {NotFoundError} Thrown if the player who is being muted is not online.
	 * @see {@link postGameLabsAction} for more information.
	 * @see {@link lbUnmutePlayer} for more information on unmuting a player.
	 */
	public async lbMutePlayer(options: LBMutePlayerOptions): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.LB_Gamelabs_MutePlayer,
			actionContext: "player",
			referenceKey: steam64,
			parameters: {
				int: {
					dataType: "int",
					valueInt: options.durationInMinutes,
				},
			},
		});

		this.logger.debug("Successfully muted player (LB)", response);
	}

	/**
	 * This action will unmute a player that is currently connected to the server.
	 *
	 * The `target` parameter can be a CFTools ID, a dynamic player ID, or a session id.
	 * If the `target` parameter is a dynamic player ID, it will be resolved to a session id
	 * before being used in the request.
	 *
	 * The mod {@link https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692 GameLabs}
	 * is required to be installed on the server for this action to work.
	 *
	 * The mod {@link https://lbmaster.de/product.php?id=4 Advanced Groups}
	 * is required to be installed on the server for this action to work.
	 * @param options The options to unmute a player with.
	 * @throws {NotFoundError} Thrown if the player who is being unmuted is not online.
	 * @see {@link postGameLabsAction} for more information.
	 * @see {@link lbMutePlayer} for more information on muting a player.
	 */
	public async lbUnmutePlayer(
		options: TargetActionOptionsNoParams,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const steam64 = await this.resolvePlayerReferenceKey(options);

		if (!steam64) {
			throw new NotFoundError(null, "Player session not found");
		}

		const response = await this.postGameLabsAction({
			serverApiId: resolvedServerApiId,
			actionCode: GameLabsActionCode.LB_Gamelabs_UnmutePlayer,
			actionContext: "player",
			referenceKey: steam64,
		});

		this.logger.debug("Successfully unmuted player (LB)", response);
	}

	/**
	 * Queries the priority queue list/bucket for a specific player.
	 *
	 * The `playerId` parameter can be a CFTools ID or a dynamic player ID.
	 * If the `playerId` parameter is a dynamic player ID, it will be resolved to a CFTools ID
	 * before being used in the request.
	 *
	 * The `comment` parameter is an optional comment to filter the priority queue list with.
	 * @param options The options to get the priority queue with.
	 * @returns The priority queue list/bucket for the player.
	 * @throws {NotFoundError} Thrown if the player is not found in the priority queue bucket/list.
	 * @see {@link postPriorityQueue} for more information on posting to the priority queue.
	 * @see {@link deletePriorityQueue} for more information on deleting from the priority queue.
	 * @see {`/server/{serverApiId}/queuepriority`} for more information on the CFTools API endpoint.
	 */
	public async getPriorityQueue(
		options: GetPriorityQueueOptions,
	): Promise<ClientPriorityQueueResponse> {
		const cachePrefix = "priorityQueue";
		const cacheKey = CacheManager.hashKeyFromObject(options);
		const cachedResponse = await this.cacheGet<ClientPriorityQueueResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached priority queue", cachedResponse);
			return cachedResponse;
		}

		const resolvedOptions: Record<string, string> = {};

		if (options.playerId) {
			resolvedOptions.cftools_id =
				typeof options.playerId === "string" && isCFToolsId(options.playerId)
					? options.playerId
					: (await this.lookupUser(options.playerId)).cftoolsId;
		}

		if (options.comment) {
			resolvedOptions.comment = options.comment;
		}

		const response = await this.requestClient.get<PriorityQueueResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/queuepriority`,
				resolvedOptions,
			),
		);

		if (response.entries.length === 0) {
			throw new NotFoundError(null, "Player not found in priority queue");
		}

		const transformedResponse = transformPriorityQueueResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed priority queue",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Posts a player to the priority queue list/bucket.
	 *
	 * The `playerId` parameter can be a CFTools ID or a dynamic player ID.
	 * If the `playerId` parameter is a dynamic player ID, it will be resolved to a CFTools ID
	 * before being used in the request.
	 *
	 * - The `expiresAt` parameter is an optional date to expire the player from the priority queue,
	 * if not provided the player will be in the priority queue indefinitely/permanent.
	 * - The `comment` parameter is a required comment to add to the priority queue entry.
	 * @param options The options to post to the priority queue with.
	 * @throws {DuplicateEntryError} Thrown if the player is already in the priority queue.
	 * @see {@link getPriorityQueue} for more information on getting the priority queue.
	 * @see {@link deletePriorityQueue} for more information on deleting from the priority queue.
	 * @see {`/server/{serverApiId}/queuepriority`} for more information on the CFTools API endpoint.
	 */
	public async postPriorityQueue(
		options: PostPriorityQueueOptions,
	): Promise<void> {
		const resolvedPlayerId = await this.resolveDynamicPlayerId(options);

		let currentPriorityQueue = null;
		try {
			currentPriorityQueue = await this.getPriorityQueue({
				serverApiId: options.serverApiId,
				playerId: resolvedPlayerId,
			});
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		if (currentPriorityQueue && currentPriorityQueue.length > 0) {
			throw new DuplicateEntryError(
				null,
				"Player is already in the priority queue",
			);
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/queuepriority`,
			),
			{
				cftools_id: resolvedPlayerId,
				expires_at: options.expiresAt ? options.expiresAt.toISOString() : null,
				comment: options.comment,
			},
		);

		await this.cacheManager.clearPrefixEntries("priorityQueue");

		this.logger.debug("Successfully posted to priority queue", response);
	}

	/**
	 * Deletes a player from the priority queue list/bucket.
	 *
	 * The `playerId` parameter can be a CFTools ID or a dynamic player ID.
	 * If the `playerId` parameter is a dynamic player ID, it will be resolved to a CFTools ID
	 * before being used in the request.
	 * @param options The options to delete from the priority queue with.
	 * @see {@link getPriorityQueue} for more information on getting the priority queue.
	 * @see {@link postPriorityQueue} for more information on posting to the priority queue.
	 * @throws {NotFoundError} Thrown if the player is not found in the priority queue.
	 * @throws {InvalidOptionError} Thrown if the player is not found in the priority queue.
	 * @see {`/server/{serverApiId}/queuepriority`} for more information on the CFTools API endpoint.
	 */
	public async deletePriorityQueue(
		options: DeletePriorityQueueOptions,
	): Promise<void> {
		const resolvedPlayerId = await this.resolveDynamicPlayerId(options);

		const response = await this.requestClient.delete(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/queuepriority`,
				{
					cftools_id: resolvedPlayerId,
				},
			),
		);

		await this.cacheManager.clearPrefixEntries("priorityQueue");

		this.logger.debug("Successfully deleted from priority queue", response);
	}

	/**
	 * Queries the whitelist for a specific player.
	 *
	 * The `playerId` parameter can be a CFTools ID or a dynamic player ID.
	 * If the `playerId` parameter is a dynamic player ID, it will be resolved to a CFTools ID
	 * before being used in the request.
	 *
	 * The `comment` parameter is an optional comment to filter the whitelist with.
	 * @param options The options to get the whitelist with.
	 * @returns The whitelist for the player.
	 * @throws {InvalidServerIdError} Thrown if the server identifier is invalid.
	 * @see {@link postWhitelist} for more information on posting to the whitelist.
	 * @see {@link deleteWhitelist} for more information on deleting from the whitelist.
	 * @see {`/v1/server/{server_id}/whitelist`} for more information.
	 */
	public async getWhitelist(
		options: GetWhitelistOptions,
	): Promise<ClientWhitelistResponse> {
		const cachePrefix = "whitelist";
		const cacheKey = CacheManager.hashKeyFromObject(options);
		const cachedResponse = await this.cacheGet<ClientWhitelistResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached whitelist", cachedResponse);
			return cachedResponse;
		}

		const resolvedOptions: Record<string, string> = {};

		if (options.playerId) {
			resolvedOptions.cftools_id =
				typeof options.playerId === "string" && isCFToolsId(options.playerId)
					? options.playerId
					: (await this.lookupUser(options.playerId)).cftoolsId;
		}

		if (options.comment) {
			resolvedOptions.comment = options.comment;
		}

		const response = await this.requestClient.get<WhitelistResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/whitelist`,
				resolvedOptions,
			),
		);

		const transformedResponse = transformWhitelistResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug("Transformed whitelist", response, transformedResponse);

		return transformedResponse;
	}

	/**
	 * Posts a player to the whitelist.
	 *
	 * The `playerId` parameter can be a CFTools ID or a dynamic player ID.
	 * If the `playerId` parameter is a dynamic player ID, it will be resolved to a CFTools ID
	 * before being used in the request.
	 *
	 * - The `expiresAt` parameter is an optional date to expire the player from the whitelist,
	 * if not provided the player will be in the whitelist indefinitely/permanent.
	 * - The `comment` parameter is  a required comment to add to the whitelist entry.
	 * @param options The options to post to the whitelist with.
	 * @throws {DuplicateEntryError} Thrown if the player is already in the whitelist.
	 * @see {@link getWhitelist} for more information on getting the whitelist.
	 * @see {@link deleteWhitelist} for more information on deleting from the whitelist.
	 * @see {`/v1/server/{server_id}/whitelist`} for more information.
	 */
	public async postWhitelist(options: PostWhitelistOptions): Promise<void> {
		const resolvedPlayerId = await this.resolveDynamicPlayerId(options);

		const currentWhitelist = await this.getWhitelist({
			serverApiId: options.serverApiId,
			playerId: resolvedPlayerId,
		});

		if (currentWhitelist.length > 0) {
			throw new DuplicateEntryError(null, "Player is already in the whitelist");
		}

		const response = await this.requestClient.post(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/whitelist`,
			),
			{
				cftools_id: resolvedPlayerId,
				expires_at: options.expiresAt ? options.expiresAt.toISOString() : null,
				comment: options.comment,
			},
		);

		await this.cacheManager.clearPrefixEntries("whitelist");

		this.logger.debug("Successfully posted to whitelist", response);
	}

	/**
	 * Removes a player from the whitelist.
	 *
	 * The `playerId` parameter can be a CFTools ID or a dynamic player ID.
	 * If the `playerId` parameter is a dynamic player ID, it will be resolved to a CFTools ID
	 * before being used in the request.
	 * @param options The options to delete from the whitelist with.
	 * @throws {NotFoundError} Thrown if the player is not found in the whitelist.
	 * @throws {InvalidOptionError} Thrown if the player is not found in the whitelist.
	 * @see {@link getWhitelist} for more information on getting the whitelist.
	 * @see {@link postWhitelist} for more information on posting to the whitelist.
	 * @see {`/v1/server/{server_id}/whitelist`} for more information.
	 */
	public async deleteWhitelist(options: DeleteWhitelistOptions): Promise<void> {
		const resolvedPlayerId = await this.resolveDynamicPlayerId(options);

		const response = await this.requestClient.delete(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${options.serverApiId}/whitelist`,
				{
					cftools_id: resolvedPlayerId,
				},
			),
		);

		await this.cacheManager.clearPrefixEntries("whitelist");

		this.logger.debug("Successfully deleted from whitelist", response);
	}

	/**
	 * Fetches the leaderboard for a specific game-server.
	 * @param options The options to fetch the leaderboard with.
	 * @returns The leaderboard for the game-server.
	 * @throws {InvalidServerIdError} Thrown if the server identifier is invalid.
	 * @throws {InvalidOptionError} Thrown if the leaderboard type is invalid.
	 * @throws {LengthMismatchError} Thrown if the leaderboard limit is invalid.
	 * @throws {MinLengthNotReachedError} Thrown if the leaderboard limit is too low.
	 * @throws {MaxLengthExceededError} Thrown if the leaderboard limit is too high.
	 * @see {`/v1/leaderboard/{server_id}`} for more information.
	 */
	public async leaderboard(
		options: LeaderboardOptions,
	): Promise<ClientLeaderboardResponse> {
		const cachePrefix = "leaderboard";
		const cacheKey = CacheManager.hashKeyFromObject(options);
		const cachedResponse = await this.cacheGet<ClientLeaderboardResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached leaderboard", cachedResponse);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);

		if (options.limit < 1 || options.limit > 100) {
			throw new LengthMismatchError(
				null,
				"Leaderboard limit must be between 1 and 100",
			);
		}

		const response = await this.requestClient.get<LeaderboardResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V1,
				`/server/${resolvedServerApiId}/leaderboard`,
				{
					stat: options.stat,
					order: options.order.toString(10),
					limit: options.limit.toString(10),
				},
			),
		);

		const transformedResponse = transformLeaderboardResponse(response);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug("Transformed leaderboard", response, transformedResponse);

		return transformedResponse;
	}

	/**
	 * Fetches the player statistics for a specific game-server.
	 * @param options The options to fetch the player statistics with.
	 * @returns The player statistics for the game-server.
	 * @throws {InvalidServerIdError} Thrown if the server identifier is invalid.
	 * @see {`/v2/server/{server_id}/player`} for more information.
	 */
	public async getPlayerStats(
		options: GetPlayerStatsOptions,
	): Promise<ClientPlayerStatsResponse> {
		const cachePrefix = "playerStats";
		const cacheKey = CacheManager.hashKeyFromObject(options);
		const cachedResponse = await this.cacheGet<ClientPlayerStatsResponse>(
			cachePrefix,
			cacheKey,
		);

		if (cachedResponse) {
			this.logger.debug("Returning cached player statistics", cachedResponse);
			return cachedResponse;
		}

		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const resolvedPlayerId = await this.resolveDynamicPlayerId(options);

		const response = await this.requestClient.get<PlayerStatsResponse>(
			this.requestClient.apiUrl(
				API_VERSION.V2,
				`/server/${resolvedServerApiId}/player`,
				{
					cftools_id: resolvedPlayerId,
				},
			),
		);

		const transformedResponse = transformPlayerStatsResponse(
			response,
			resolvedPlayerId,
		);

		this.cacheSet(cachePrefix, cacheKey, transformedResponse);
		this.logger.debug(
			"Transformed player statistics",
			response,
			transformedResponse,
		);

		return transformedResponse;
	}

	/**
	 * Resets the player statistics for a specific game-server.
	 * @param options The options to reset the player statistics with.
	 * @throws {InvalidServerIdError} Thrown if the server identifier is invalid.
	 * @throws {NotFoundError} Thrown if the player is not found.
	 * @see {`/v2/server/{server_id}/player`} for more information.
	 */
	public async resetPlayerStats(
		options: DeletePlayerStatsOptions,
	): Promise<void> {
		const resolvedServerApiId = this.authProvider.resolveServerApiId(
			options.serverApiId,
			true,
		);
		const resolvedPlayerId = await this.resolveDynamicPlayerId(options);

		const response = await this.requestClient.delete(
			this.requestClient.apiUrl(
				API_VERSION.V2,
				`/server/${resolvedServerApiId}/player`,
				{
					cftools_id: resolvedPlayerId,
				},
			),
		);

		await this.cacheManager.clearPrefixEntries("playerStats");

		this.logger.debug("Successfully deleted player statistics", response);
	}
}
