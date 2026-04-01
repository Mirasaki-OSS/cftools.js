import type { AnyPlayerId } from "../../resolvers/player-ids";

export type KickOptions = {
	id: string | AnyPlayerId;
	reason: string;
	serverApiId?: string;
};
