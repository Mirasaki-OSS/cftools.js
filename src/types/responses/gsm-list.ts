import type { CamelCasedPropertiesDeep } from "type-fest";
import type { AnyPlayerId } from "../../resolvers/player-ids";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type GetSessionByCFToolsIdOptions = {
	playerId: string | AnyPlayerId;
	serverApiId?: string;
};

export type PlayerSessionConnection = {
	country_code: string;
	country_names: {
		de: string;
		en: string;
		es: string;
		fr: string;
		ja: string;
		"pt-BR": string;
		ru: string;
		"zh-CN": string;
	};
	ipv4: string;
	malicious: boolean;
	provider: string | null;
};

export type PlayerSessionGameData = {
	player_name: string;
	steam64: string;
};

export type PlayerSessionInfo = {
	ban_count: number;
	labels: string[];
	radar?: {
		evaluated: boolean;
		flags: string[];
		indicators: {
			ar: number;
			bcpt: number;
			czr: number;
			ipss: number;
			kdr: number;
			logdip: number;
			lsd: number;
			nopb: number;
			novb: number;
			player_age: number;
			playtime_days: number;
			playtime_per_session: number;
			playtime_total: number;
			ucoun: number;
		};
		results: {
			score: number;
		};
		score: number;
	};
};

export type PlayerSessionLive = {
	load_time: number;
	loaded: boolean;
	ping: {
		actual: number;
		trend: number;
	};
	position: {
		join: [number, number, number];
		latest: [number, number, number];
		leave: [number, number, number] | null;
	};
};

export type PlayerSessionPersona = {
	bans: {
		community: false;
		economy: string;
		game: number;
		last_ban: number;
		vac: number;
	} | null;
	profile: {
		avatar: string;
		name: string;
		private: boolean;
	};
};

export type PlayerSessionStats = {
	kills?: number;
	deaths?: number;
	suicides?: number;
	hits?: number;
	longest_kill?: number;
	longest_shot?: number;
};

export type PlayerSession = {
	cftools_id: string;
	connection: PlayerSessionConnection;
	created_at: string;
	gamedata: PlayerSessionGameData;
	id: string;
	info: PlayerSessionInfo;
	live: PlayerSessionLive;
	persona: PlayerSessionPersona;
	stats: PlayerSessionStats;
};

export type PlayerListResponse = BaseResponse & {
	sessions: PlayerSession[];
};

export type ClientPlayerSession = CamelCasedPropertiesDeep<
	Omit<PlayerSession, "created_at">
> & {
	createdAt: Date;
};

export type ClientPlayerListResponse = ClientBaseResponse<
	ClientPlayerSession[]
>;
