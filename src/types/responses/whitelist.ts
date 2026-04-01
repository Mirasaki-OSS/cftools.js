import type { CamelCasedPropertiesDeep } from "type-fest";
import type { AnyPlayerId } from "../../resolvers/player-ids";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type GetWhitelistOptions = {
	serverApiId?: string;
	playerId?: AnyPlayerId | string;
	comment?: string;
};

export type PostWhitelistOptions = {
	serverApiId?: string;
	playerId: AnyPlayerId | string;
	comment: string;
	expiresAt?: Date | null;
};

export type DeleteWhitelistOptions = {
	serverApiId?: string;
	playerId: AnyPlayerId | string;
};

export type WhitelistEntry = {
	created_at: string;
	creator: {
		cftools_id: string;
	};
	links: {
		href: string;
		method: string;
		relationship: string;
	}[];
	meta: {
		comment: string;
		expiration: string | null;
		from_api: boolean;
	};
	updated_at: string;
	user: {
		cftools_id: string;
	};
	uuid: string;
};

export type WhitelistResponse = BaseResponse & {
	entries: WhitelistEntry[];
};

export type ClientWhitelistResponse = ClientBaseResponse<
	CamelCasedPropertiesDeep<
		Omit<WhitelistEntry, "created_at" | "updated_at" | "meta"> & {
			createdAt: Date;
			updatedAt: Date;
			meta: CamelCasedPropertiesDeep<
				Omit<WhitelistEntry["meta"], "expiration"> & {
					expiration: Date | null;
				}
			>;
		}
	>[]
>;
