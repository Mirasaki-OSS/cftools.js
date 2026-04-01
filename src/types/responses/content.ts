import type { AnyPlayerId } from "../../resolvers/player-ids";

export type MessagePrivateOptions = {
	id: string | AnyPlayerId;
	content: string;
	serverApiId?: string;
};

export type MessageServerOptions = {
	content: string;
	serverApiId?: string;
};

export type RawRConCommandOptions = {
	command: string;
	serverApiId?: string;
};
