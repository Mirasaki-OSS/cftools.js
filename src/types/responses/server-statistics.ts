import type { CamelCasedPropertiesDeep } from "type-fest";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type AggregatedStatistics = {
	daily: number[];
	monthly: number[];
	weekly: number[];
};

export type NonDailyAggregatedStatistics = Omit<AggregatedStatistics, "daily">;

export type ServerStatisticsAggregated = {
	player_individual: AggregatedStatistics;
	player_influx: AggregatedStatistics;
	player_new_retention: AggregatedStatistics;
	player_retention: NonDailyAggregatedStatistics;
	playtime: AggregatedStatistics;
	sessions: AggregatedStatistics;
	top_countries: string[];
};

export type ServerStatisticsGeneral = {
	mod_complexity: number;
	playtime_total_seconds: number;
	sessions_total: number;
};

export type ServerStatisticsResponse = BaseResponse & {
	statistics: {
		aggregated: ServerStatisticsAggregated;
		general: ServerStatisticsGeneral;
	};
};

export type ClientServerStatisticsResponse = ClientBaseResponse<
	CamelCasedPropertiesDeep<ServerStatisticsResponse["statistics"]>
>;
