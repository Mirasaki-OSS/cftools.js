import { LibraryParsingError } from "../classes/errors";
import type {
	ClientGameLabsActionsResponse,
	ClientGameLabsEntityEventsResponse,
	ClientGameLabsEntityVehiclesResponse,
	ClientGameServerResponse,
	ClientGrantsResponse,
	ClientLeaderboardResponse,
	ClientListBansResponse,
	ClientPlayerListResponse,
	ClientPlayerStatsGameDayZ,
	ClientPlayerStatsResponse,
	ClientPriorityQueueResponse,
	ClientServerInfoResponse,
	ClientServerStatisticsResponse,
	ClientWhitelistResponse,
	GameLabsActionsResponse,
	GameLabsEntityEventsResponse,
	GameLabsEntityVehiclesResponse,
	GameServerResponse,
	GrantsResponse,
	LeaderboardResponse,
	ListBansResponse,
	PlayerListResponse,
	PlayerStatisticsValues,
	PlayerStatisticsZones,
	PlayerStatsResponse,
	PriorityQueueResponse,
	ServerInfoResponse,
	ServerStatisticsResponse,
	WhitelistResponse,
} from "../types/responses";

export const transformGrantResponse = (
	response: GrantsResponse,
): ClientGrantsResponse => {
	return {
		banlist:
			response.tokens.banlist?.map((token) => ({
				createdAt: new Date(token.created_at),
				resource: {
					id: token.resource.id,
					identifier: token.resource.identifier,
					objectId: token.resource.object_id,
				},
			})) ?? [],
		server:
			response.tokens.server?.map((token) => ({
				createdAt: new Date(token.created_at),
				resource: {
					id: token.resource.id,
					identifier: token.resource.identifier,
					objectId: token.resource.object_id,
					gameserverId: token.resource.gameserver_id,
				},
			})) ?? [],
	};
};

export const transformGameServerDetails = (
	response: GameServerResponse,
	serverId: string,
): ClientGameServerResponse => {
	const responseData = response[serverId];
	return {
		...responseData,
		object: {
			error: responseData._object.error,
			createdAt: new Date(responseData._object.created_at),
			updatedAt: new Date(responseData._object.updated_at),
		},
		environment: {
			time: responseData.environment.time,
			timeAcceleration: responseData.environment.time_acceleration,
			perspectives: {
				"1Rd": responseData.environment.perspectives["1rd"],
				"3Rd": responseData.environment.perspectives["3rd"],
			},
		},
		host: {
			address: responseData.host.address,
			gamePort: responseData.host.game_port,
			os: responseData.host.os,
			queryPort: responseData.host.query_port,
		},
		mods:
			responseData.mods?.map((mod) => ({
				fileId: mod.file_id,
				name: mod.name,
			})) ?? [],
	};
};

export const transformBanListResponse = (
	response: ListBansResponse,
): ClientListBansResponse => {
	return (
		response.entries?.map((ban) => ({
			id: ban.id,
			reason: ban.reason,
			expiresAt: ban.expires_at ? new Date(ban.expires_at) : null,
			createdAt: new Date(ban.created_at),
			updatedAt: new Date(ban.updated_at),
			status: ban.status,
			identifier: ban.identifier,
			links: ban.links,
		})) ?? []
	);
};

export const transformServerInfoResponse = (
	response: ServerInfoResponse,
): ClientServerInfoResponse => {
	return {
		links: response.links,
		object: {
			nickname: response.server._object.nickname,
			resourceOwner: response.server._object.resource_owner,
			createdAt: new Date(response.server._object.created_at),
			updatedAt: new Date(response.server._object.updated_at),
		},
		connection: {
			peerVersion: response.server.connection.peer_version,
			prefilledCommands: response.server.connection.prefilled_commands,
			protocolUsed: // @ts-expect-error - Typo in response, waiting for CFTools to update
				response.server.connection.protocol_used ??
				response.server.connection.protcol_used,
			restricted: response.server.connection.restricted,
		},
		gameserver: {
			link: response.server.gameserver.LINK,
			game: response.server.gameserver.game,
			gameIntegration: {
				capabilities: response.server.gameserver.game_integration.capabilities,
				pollProtocol: response.server.gameserver.game_integration.poll_protocol,
				status: response.server.gameserver.game_integration.status,
				updatedAt: response.server.gameserver.game_integration.updated_at
					? new Date(response.server.gameserver.game_integration.updated_at)
					: null,
				version: response.server.gameserver.game_integration.version,
			},
			gameserverId: response.server.gameserver.gameserver_id,
			runtime: {
				gametime: response.server.gameserver.runtime?.gametime,
				restartSchedule: response.server.gameserver.runtime?.restart_schedule,
				uptime: response.server.gameserver.runtime?.uptime,
			},
		},
		worker: {
			clientId: response.server.worker.client_id,
			state: response.server.worker.state,
		},
	};
};

export const transformServerStatisticsResponse = (
	response: ServerStatisticsResponse,
): ClientServerStatisticsResponse => {
	return {
		general: {
			modComplexity: response.statistics.general.mod_complexity,
			playtimeTotalSeconds: response.statistics.general.playtime_total_seconds,
			sessionsTotal: response.statistics.general.sessions_total,
		},
		aggregated: {
			playerIndividual: {
				daily: response.statistics.aggregated.player_individual.daily,
				monthly: response.statistics.aggregated.player_individual.monthly,
				weekly: response.statistics.aggregated.player_individual.weekly,
			},
			playerInflux: {
				daily: response.statistics.aggregated.player_influx.daily,
				monthly: response.statistics.aggregated.player_influx.monthly,
				weekly: response.statistics.aggregated.player_influx.weekly,
			},
			playerNewRetention: {
				daily: response.statistics.aggregated.player_new_retention.daily,
				monthly: response.statistics.aggregated.player_new_retention.monthly,
				weekly: response.statistics.aggregated.player_new_retention.weekly,
			},
			playerRetention: {
				monthly: response.statistics.aggregated.player_retention.monthly,
				weekly: response.statistics.aggregated.player_retention.weekly,
			},
			playtime: {
				daily: response.statistics.aggregated.playtime.daily,
				monthly: response.statistics.aggregated.playtime.monthly,
				weekly: response.statistics.aggregated.playtime.weekly,
			},
			sessions: {
				daily: response.statistics.aggregated.sessions.daily,
				monthly: response.statistics.aggregated.sessions.monthly,
				weekly: response.statistics.aggregated.sessions.weekly,
			},
			topCountries: response.statistics.aggregated.top_countries,
		},
	};
};

export const transformPlayerListResponse = (
	response: PlayerListResponse,
): ClientPlayerListResponse => {
	return (
		response.sessions?.map((session) => ({
			id: session.id,
			cftoolsId: session.cftools_id,
			connection: {
				countryCode: session.connection.country_code,
				countryNames: {
					de: session.connection.country_names.de,
					en: session.connection.country_names.en,
					es: session.connection.country_names.es,
					fr: session.connection.country_names.fr,
					ja: session.connection.country_names.ja,
					ru: session.connection.country_names.ru,
					ptBr: session.connection.country_names["pt-BR"],
					zhCn: session.connection.country_names["zh-CN"],
				},
				ipv4: session.connection.ipv4,
				malicious: session.connection.malicious,
				provider: session.connection.provider,
			},
			createdAt: new Date(session.created_at),
			gamedata: {
				playerName: session.gamedata.player_name,
				steam64: session.gamedata.steam64,
			},
			info: {
				banCount: session.info.ban_count,
				labels: session.info.labels,
				radar: session.info.radar
					? {
							evaluated: session.info.radar.evaluated,
							flags: session.info.radar.flags,
							indicators: {
								ar: session.info.radar.indicators.ar,
								bcpt: session.info.radar.indicators.bcpt,
								czr: session.info.radar.indicators.czr,
								ipss: session.info.radar.indicators.ipss,
								kdr: session.info.radar.indicators.kdr,
								logdip: session.info.radar.indicators.logdip,
								lsd: session.info.radar.indicators.lsd,
								nopb: session.info.radar.indicators.nopb,
								novb: session.info.radar.indicators.novb,
								playerAge: session.info.radar.indicators.player_age,
								playtimeDays: session.info.radar.indicators.playtime_days,
								playtimePerSession:
									session.info.radar.indicators.playtime_per_session,
								playtimeTotal: session.info.radar.indicators.playtime_total,
								ucoun: session.info.radar.indicators.ucoun,
							},
							results: session.info.radar.results,
							score: session.info.radar.score,
						}
					: undefined,
			},
			live: {
				loaded: session.live.loaded,
				loadTime: session.live.load_time,
				ping: session.live.ping,
				position: session.live.position,
			},
			persona: {
				bans: {
					community: session.persona.bans?.community ?? false,
					economy: session.persona.bans?.economy ?? "",
					game: session.persona.bans?.game ?? 0,
					lastBan: session.persona.bans?.last_ban ?? 0,
					vac: session.persona.bans?.vac ?? 0,
				},
				profile: session.persona.profile,
			},
			stats: {
				deaths: session.stats.deaths,
				hits: session.stats.hits,
				kills: session.stats.kills,
				longestKill: session.stats.longest_kill,
				longestShot: session.stats.longest_shot,
				suicides: session.stats.suicides,
			},
		})) ?? []
	);
};

export const transformGameLabsActionsResponse = (
	response: GameLabsActionsResponse,
): ClientGameLabsActionsResponse => {
	return response.available_actions;
};

export const transformGameLabsEntityEventsResponse = (
	response: GameLabsEntityEventsResponse,
): ClientGameLabsEntityEventsResponse => {
	return response.entities;
};

export const transformGameLabsEntityVehiclesResponse = (
	response: GameLabsEntityVehiclesResponse,
): ClientGameLabsEntityVehiclesResponse => {
	return response.entities;
};

export const transformPriorityQueueResponse = (
	response: PriorityQueueResponse,
): ClientPriorityQueueResponse => {
	return (
		response.entries?.map((entry) => ({
			createdAt: new Date(entry.created_at),
			creator: {
				cftoolsId: entry.creator.cftools_id,
			},
			links: entry.links,
			meta: {
				comment: entry.meta.comment,
				expiration: entry.meta.expiration
					? new Date(entry.meta.expiration)
					: null,
				fromApi: entry.meta.from_api,
			},
			updatedAt: new Date(entry.updated_at),
			user: {
				cftoolsId: entry.user.cftools_id,
			},
			uuid: entry.uuid,
		})) ?? []
	);
};

export const transformWhitelistResponse = (
	response: WhitelistResponse,
): ClientWhitelistResponse => {
	return (
		response.entries?.map((entry) => ({
			createdAt: new Date(entry.created_at),
			creator: {
				cftoolsId: entry.creator.cftools_id,
			},
			links: entry.links,
			meta: {
				comment: entry.meta.comment,
				expiration: entry.meta.expiration
					? new Date(entry.meta.expiration)
					: null,
				fromApi: entry.meta.from_api,
			},
			updatedAt: new Date(entry.updated_at),
			user: {
				cftoolsId: entry.user.cftools_id,
			},
			uuid: entry.uuid,
		})) ?? []
	);
};

export const transformLeaderboardResponse = (
	response: LeaderboardResponse,
): ClientLeaderboardResponse => {
	return (
		response.leaderboard?.map((entry) => ({
			cftoolsId: entry.cftools_id,
			deaths: entry.deaths,
			environmentDeaths: entry.environment_deaths,
			hits: entry.hits,
			kdratio: entry.kdratio,
			kills: entry.kills,
			latestName: entry.latest_name,
			longestKill: entry.longest_kill,
			longestShot: entry.longest_shot,
			playtime: entry.playtime,
			rank: entry.rank,
			suicides: entry.suicides,
		})) ?? []
	);
};

export const transformPlayerStatsResponse = (
	response: PlayerStatsResponse,
	resolvedPlayerId: string,
): ClientPlayerStatsResponse => {
	const isPlayerStatisticsValues = (
		value: unknown,
	): value is PlayerStatisticsValues => {
		return (
			!!value &&
			typeof value === "object" &&
			"created_at" in value &&
			"updated_at" in value &&
			"cleared_at" in value &&
			"omega" in value &&
			"game" in value
		);
	};

	const responseData = isPlayerStatisticsValues(response[resolvedPlayerId])
		? response[resolvedPlayerId]
		: null;

	if (!responseData) {
		throw new LibraryParsingError(
			"Unresolved player statistics, please create a GitHub issue if you believe this is incorrect",
		);
	}

	const castWeaponStatToNumber = (key: string, value: unknown): number => {
		const valueKey = key as keyof typeof value;
		return value &&
			typeof value === "object" &&
			valueKey in value &&
			typeof value[valueKey] === "number"
			? value[valueKey]
			: 0;
	};

	const castWeaponZones = (
		value: unknown,
	): PlayerStatisticsZones | undefined => {
		return value && typeof value === "object" && "zones" in value
			? (value.zones as PlayerStatisticsZones)
			: undefined;
	};

	return {
		identities: {
			battleye: {
				guid: response.identities.battleye.guid,
			},
			bohemiainteractive: {
				uid: response.identities.bohemiainteractive.uid,
			},
			steam: {
				steam64: response.identities.steam.steam64,
			},
		},
		values: {
			createdAt: new Date(responseData.created_at),
			clearedAt: new Date(responseData.cleared_at),
			updatedAt: new Date(responseData.updated_at),
			omega: {
				nameHistory: responseData.omega.name_history,
				playtime: responseData.omega.playtime,
				sessions: responseData.omega.sessions,
			},
			game: {
				dayz: responseData.game.dayz
					? {
							deaths: responseData.game.dayz.deaths,
							distanceTraveled: responseData.game.dayz.distance_traveled,
							environmentDeaths: responseData.game.dayz.environment_deaths,
							hits: responseData.game.dayz.hits,
							kdratio: responseData.game.dayz.kdratio,
							kills: {
								animals: responseData.game.dayz.kills?.animals ?? 0,
								infected: responseData.game.dayz.kills?.infected ?? 0,
								players: responseData.game.dayz.kills?.players ?? 0,
							},
							longestKill: responseData.game.dayz.longest_kill,
							longestShot: responseData.game.dayz.longest_shot,
							shots: {
								fired: responseData.game.dayz.shots?.fired ?? 0,
								hit: responseData.game.dayz.shots?.hit ?? 0,
								hitAnimals: responseData.game.dayz.shots?.hit_animals ?? 0,
								hitInfected: responseData.game.dayz.shots?.hit_infected ?? 0,
								hitPlayers: responseData.game.dayz.shots?.hit_players ?? 0,
								hitVehicles: responseData.game.dayz.shots?.hit_vehicles ?? 0,
							},
							suicides: responseData.game.dayz.suicides,
							weapons: Object.entries(
								responseData.game.dayz.weapons ?? {},
							).reduce(
								(acc, [key, value]) => {
									acc[key] = {
										damage: castWeaponStatToNumber("damage", value),
										deaths: castWeaponStatToNumber("deaths", value),
										hits: castWeaponStatToNumber("hits", value),
										kills: castWeaponStatToNumber("kills", value),
										longestKill: castWeaponStatToNumber("longest_kill", value),
										longestShot: castWeaponStatToNumber("longest_shot", value),
										zones: castWeaponZones(value),
									};
									return acc;
								},
								{} as ClientPlayerStatsGameDayZ["weapons"],
							),
							zones: responseData.game.dayz.zones,
						}
					: undefined,
			},
		},
	};
};
