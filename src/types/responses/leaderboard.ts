import type { CamelCasedPropertiesDeep } from "type-fest";
import type { LeaderboardSort, LeaderboardStat } from "../general";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type LeaderboardOptions = {
	serverApiId?: string;
	stat: LeaderboardStat;
	order: LeaderboardSort;
	/**
	 * An integer between 1 and 100
	 * @default 10
	 */
	limit: number;
};

export type LeaderboardEntry = {
	cftools_id: string;
	deaths: number;
	environment_deaths: number;
	hits: number;
	kdratio: number;
	kills: number;
	latest_name: string;
	longest_kill: number;
	longest_shot: number;
	playtime: number;
	rank: number;
	suicides: number;
};

export type LeaderboardResponse = BaseResponse & {
	leaderboard: LeaderboardEntry[];
};

export type ClientLeaderboardResponse = ClientBaseResponse<
	CamelCasedPropertiesDeep<LeaderboardEntry>[]
>;
