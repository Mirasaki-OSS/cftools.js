import type { CamelCasedPropertiesDeep } from "type-fest";
import type { Game } from "../general";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type ServerInfoLink = {
	href: string;
	method: string;
	relationship: string;
};

export type ServerInfoObject = {
	created_at: string;
	nickname: string;
	resource_owner: string;
	updated_at: string;
};

export type ServerInfoConnection = {
	peer_version: string;
	prefilled_commands: boolean;
	protcol_used: string;
	restricted: boolean;
};

export type ServerInfoGameServerIntegration = {
	capabilities: string[];
	poll_protocol: string;
	status: boolean;
	updated_at: string | null;
	version: string | null;
};

export type ServerInfoGameServerRuntimeRestartSchedule = {
	next?: {
		local: string | null;
		utc: string | null;
	};
};

export type ServerInfoGameServerRuntime = {
	gametime?: string;
	restart_schedule?: ServerInfoGameServerRuntimeRestartSchedule;
	uptime?: number;
};

export type ServerInfoGameServer = {
	LINK: string;
	game: Game;
	game_integration: ServerInfoGameServerIntegration;
	gameserver_id: string;
	runtime: ServerInfoGameServerRuntime;
};

export type ServerInfoWorker = {
	client_id: string;
	state: "WorkerState.CONNECTED" | "WorkerState.DISCONNECTED";
};

export type ServerInfoResponse = BaseResponse & {
	links: ServerInfoLink[];
	server: {
		_object: ServerInfoObject;
		connection: ServerInfoConnection;
		gameserver: ServerInfoGameServer;
		worker: ServerInfoWorker;
	};
};

export type ClientServerInfoResponse = ClientBaseResponse<{
	links: CamelCasedPropertiesDeep<ServerInfoLink>[];
	object: Omit<
		CamelCasedPropertiesDeep<ServerInfoObject>,
		"createdAt" | "updatedAt"
	> & {
		createdAt: Date;
		updatedAt: Date;
	};
	connection: Omit<
		CamelCasedPropertiesDeep<ServerInfoConnection>,
		"protcolUsed"
	> & {
		protocolUsed: string;
	};
	gameserver: Omit<
		CamelCasedPropertiesDeep<ServerInfoGameServer>,
		"gameIntegration"
	> & {
		gameIntegration: Omit<
			CamelCasedPropertiesDeep<ServerInfoGameServerIntegration>,
			"updatedAt"
		> & {
			updatedAt: Date | null;
		};
	};
	worker: CamelCasedPropertiesDeep<ServerInfoWorker>;
}>;
