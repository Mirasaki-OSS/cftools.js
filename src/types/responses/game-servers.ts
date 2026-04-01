import type { CamelCasedPropertiesDeep } from "type-fest";
import type { Game, GameServerQueryError } from "../general";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type GameServerObject = {
	created_at: string;
	error: GameServerQueryError;
	updated_at: string;
};

export type GameServerAttributes = {
	description: string;
	dlc: boolean;
	dlcs: {
		livonia: boolean;
		sakhal: boolean;
	};
	experimental: boolean;
	hive: string;
	modded: boolean;
	official: boolean;
	shard: string;
	whitelist: boolean;
};

export type GameServerEnvironment = {
	perspectives: {
		"1rd": boolean;
		"3rd": boolean;
	};
	time: string;
	time_acceleration: {
		general: number;
		night: number;
	};
};

export type GameServerGeolocation = {
	available: boolean;
	city: {
		name: string;
		region: string;
	};
	continent: string;
	country: {
		code: string;
		name: string;
	};
	timezone: string;
};

export type GameServerHost = {
	address: string;
	game_port: number;
	os: string;
	query_port: number;
};

export type GameServerMod = {
	file_id: string;
	name: string;
};

export type GameServerPublisher = {
	monetization: boolean;
};

export type GameServerSecurity = {
	battleye: boolean;
	password: boolean;
	vac: boolean;
};

export type GameServerStatus = {
	bots: boolean;
	players: number;
	slots: number;
	queue: {
		active: boolean;
		size: number;
	};
};

export type GameServer = {
	_object: GameServerObject;
	attributes: GameServerAttributes;
	environment: GameServerEnvironment;
	game: Game;
	geolocation: GameServerGeolocation;
	host: GameServerHost;
	map: string;
	mods: GameServerMod[];
	name: string;
	offline: boolean;
	online: boolean;
	publisher: GameServerPublisher;
	rank: number;
	rating: string;
	security: GameServerSecurity;
	signatures: string[];
	status: GameServerStatus;
	version: string;
};

export type GameServerResponse = BaseResponse & {
	[key: string]: GameServer;
};

export type ClientGameServerResponse = ClientBaseResponse<
	Omit<CamelCasedPropertiesDeep<GameServer>, "object"> & {
		object: Omit<
			CamelCasedPropertiesDeep<GameServerObject>,
			"createdAt" | "updatedAt"
		> & {
			createdAt: Date;
			updatedAt: Date;
		};
	}
>;
