import type { CamelCasedPropertiesDeep } from "type-fest";

import type {
	BaseGrant,
	BaseGrantResource,
	BaseResponse,
	ClientBaseResponse,
} from "./base";

export type BanListGrant = BaseGrant;

export type ServerGrant = BaseGrant & {
	resource: BaseGrantResource & {
		gameserver_id: string;
	};
};

export type GrantsResponse = BaseResponse & {
	tokens: {
		banlist: BanListGrant[];
		server: ServerGrant[];
	};
};

export type ClientBanListGrantResponse = Omit<
	CamelCasedPropertiesDeep<BanListGrant>,
	"createdAt"
> & {
	createdAt: Date;
};

export type ClientServerGrantResponse = Omit<
	CamelCasedPropertiesDeep<ServerGrant>,
	"createdAt"
> & {
	createdAt: Date;
};

export type ClientGrantsResponse = ClientBaseResponse<{
	banlist: ClientBanListGrantResponse[];
	server: ClientServerGrantResponse[];
}>;
