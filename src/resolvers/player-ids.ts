/**
 * Skeleton for player ids, which are used to identify players in different (API) systems.
 */
export abstract class AbstractPlayerId {
	/** The string id of the player. */
	public id: string;
	/**
	 * Creates a new player id instance.
	 * @param id The string id of the player.
	 */
	constructor(id: string) {
		this.id = id;
	}
	/**
	 * Returns the raw id of the player.
	 */
	public abstract getRawId(): string;
}

export class Steam64Id extends AbstractPlayerId {
	public getRawId(): string {
		return this.id;
	}
}

export class BattlEyeGUID extends AbstractPlayerId {
	public getRawId(): string {
		return this.id;
	}
}

export class BohemiaInteractiveUID extends AbstractPlayerId {
	public getRawId(): string {
		return this.id;
	}
}

export class CFToolsId extends AbstractPlayerId {
	public getRawId(): string {
		return this.id;
	}
}

/** A player id that can be any of the supported player ids. */
export type AnyPlayerId =
	| Steam64Id
	| BattlEyeGUID
	| BohemiaInteractiveUID
	| CFToolsId;
/** Supported types of player ids. */
export type PlayerIdType =
	| "steam64"
	| "cftoolsid"
	| "battleyeguid"
	| "bohemiainteractiveuid";

/** Type guard for Steam64Id. */
export const idISteam64Id = (id: AnyPlayerId): id is Steam64Id =>
	id instanceof Steam64Id;
/** Type guard for CFToolsId. */
export const idICFToolsId = (id: AnyPlayerId): id is CFToolsId =>
	id instanceof CFToolsId;
/** Type guard for BattlEyeGUID. */
export const idIBattlEyeGUID = (id: AnyPlayerId): id is BattlEyeGUID =>
	id instanceof BattlEyeGUID;
/** Type guard for BohemiaInteractiveUID. */
export const idIBohemiaInteractiveUID = (
	id: AnyPlayerId,
): id is BohemiaInteractiveUID => id instanceof BohemiaInteractiveUID;

/**
 * @param id The id to check.
 * @returns Whether the id is a valid Steam64 id.
 */
export const isSteam64 = (id: string) => id.match(/^765[0-9]{14}$/) !== null;
/**
 * @param id The id to check.
 * @returns Whether the id is a valid CFTools id.
 */
export const isCFToolsId = (id: string) => id.match(/^[0-9a-f]{24}$/) !== null;
/**
 * @param id The id to check.
 * @returns Whether the id is a valid BattlEye GUID.
 */
export const isBattlEyeGUID = (id: string) =>
	id.match(/^[0-9a-f]{32}$/) !== null;
/**
 * @param id The id to check.
 * @returns Whether the id is a valid Bohemia Interactive UID.
 */
export const isBohemiaInteractiveUID = (id: string) =>
	id.match(/^[0-9a-zA-Z-_]{43}=$/) !== null;

/**
 * @param id The id to get the type for.
 * @returns The type of the id, or null if it is not a valid id.
 */
export const getPlayerIdType = (id: string): PlayerIdType | null => {
	if (isSteam64(id)) {
		return "steam64";
	} else if (isCFToolsId(id)) {
		return "cftoolsid";
	} else if (isBattlEyeGUID(id)) {
		return "battleyeguid";
	} else if (isBohemiaInteractiveUID(id)) {
		return "bohemiainteractiveuid";
	}

	return null;
};
