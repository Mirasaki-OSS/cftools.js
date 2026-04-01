import type { CamelCasedPropertiesDeep } from "type-fest";
import type { AnyPlayerId } from "../../resolvers/player-ids";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type GetPlayerStatsOptions = {
	serverApiId?: string;
	playerId: AnyPlayerId | string;
};

export type DeletePlayerStatsOptions = {
	serverApiId?: string;
	playerId: AnyPlayerId | string;
};

export type PlayerStatisticsZones = {
	"": number;
	brain: number;
	head: number;
	leftarm: number;
	leftfoot: number;
	lefthand: number;
	leftleg: number;
	rightarm: number;
	rightfoot: number;
	righthand: number;
	rightleg: number;
	torso: number;
};

export type PlayerStatisticsIdentities = {
	battleye: {
		guid: string;
	};
	bohemiainteractive: {
		uid: string;
	};
	steam: {
		steam64: string;
	};
};

export type PlayerStatisticsGameDayZ = {
	deaths: number;
	distance_traveled: number;
	environment_deaths: number;
	hits: number;
	kdratio: number;
	kills: {
		animals: number;
		infected: number;
		players: number;
	};
	longest_kill: number;
	longest_shot: number;
	shots: {
		fired: number;
		hit: number;
		hit_animals: number;
		hit_infected: number;
		hit_players: number;
		hit_vehicles: number;
	};
	suicides: number;
	weapons: {
		[weaponKey: string]: {
			damage: number;
			deaths: number;
			hits: number;
			kills: number;
			longest_kill: number;
			longest_shot: number;
			zones?: Partial<PlayerStatisticsZones>;
		};
	};
	zones: PlayerStatisticsZones;
};

export type PlayerStatisticsValues = {
	cleared_at: string;
	created_at: string;
	updated_at: string;
	omega: {
		name_history: string[];
		playtime: number;
		sessions: number;
	};
	game: {
		dayz?: PlayerStatisticsGameDayZ;
	};
};

export type PlayerStatsResponse = BaseResponse & {
	[playerId: string]: PlayerStatisticsValues;
} & {
	identities: PlayerStatisticsIdentities;
};

export type ClientPlayerStatsResponse = ClientBaseResponse<{
	identities: CamelCasedPropertiesDeep<PlayerStatisticsIdentities>;
	values: CamelCasedPropertiesDeep<
		Omit<PlayerStatisticsValues, "created_at" | "updated_at" | "cleared_at"> & {
			createdAt: Date;
			updatedAt: Date;
			clearedAt: Date;
		}
	>;
}>;

export type ClientPlayerStatsGameDayZ =
	CamelCasedPropertiesDeep<PlayerStatisticsGameDayZ>;
