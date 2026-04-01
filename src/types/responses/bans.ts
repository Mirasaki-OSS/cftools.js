import type { CamelCasedPropertiesDeep } from "type-fest";
import type { AnyPlayerId } from "../../resolvers/player-ids";
import type { BaseResponse, ClientBaseResponse } from "./base";

export type CreateBanListFormat = "cftools_id" | "ipv4";

export type ListBansOptions = {
	banListId: string;
	filter?: AnyPlayerId | string | null;
};

export type BaseCreateBanOptions = {
	banListId: string;
	format: CreateBanListFormat;
	reason: string;
	expires: Date | "PERMANENT";
};

export type CreateBanByPlayerIdOptions = BaseCreateBanOptions & {
	format: "cftools_id";
	identifier: string | AnyPlayerId;
};

export type CreateBanByIpOptions = BaseCreateBanOptions & {
	format: "ipv4";
	identifier: string;
};

export type CreateBanOptions =
	| CreateBanByPlayerIdOptions
	| CreateBanByIpOptions;

export type DeleteBanOptions = {
	banListId: string;
	banId: string;
};

export type BanStatus = "Ban.ACTIVE" | "Ban.INACTIVE" | "Ban.EXPIRED";

export type BanLink = {
	href: string;
	method: "DELETE";
	relationship: "delete";
};

export type BanEntry = {
	created_at: string;
	updated_at: string;
	expires_at: string | null;
	id: string;
	identifier: string;
	links: BanLink[];
	reason: string;
	status: BanStatus;
};

export type ListBansResponse = BaseResponse & {
	entries: BanEntry[];
};

export type ClientListBansResponse = ClientBaseResponse<
	(Omit<
		CamelCasedPropertiesDeep<BanEntry>,
		"createdAt" | "updatedAt" | "expiresAt"
	> & {
		createdAt: Date;
		updatedAt: Date;
		expiresAt: Date | null;
	})[]
>;
