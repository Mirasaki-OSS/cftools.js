import { createHash } from "node:crypto";
import { InvalidServerIdError } from "../classes/errors";
import type { Game } from "../types/general";

export type ResolveServerIdOptions = {
	/**
	 * The game the server is running
	 */
	game: Game;
	/**
	 * The (publicly accessible) IPv4 address of the server
	 */
	ipv4: string;
	/**
	 * The game-port the server is running on
	 */
	port: number;
};

/**
 * Resolves a unique server identifier based on the game, IPv4 address and port
 * @param options The options to resolve the server identifier
 * @returns The resolved server identifier
 * @throws {InvalidServerIdError} Thrown if the server identifier is invalid
 */
export const resolveServerId = (
	options: string | ResolveServerIdOptions,
): string => {
	if (typeof options === "string") {
		if (!isServerId(options)) {
			throw new InvalidServerIdError();
		}
		return options;
	}
	const { game, ipv4, port } = options;
	const string = `${game.toString(10)}${ipv4}${port.toString(10)}`;
	return createHash("sha1").update(string).digest("hex");
};

/**
 * Checks if a given value is a valid server identifier
 */
export const isServerId = (value: string): boolean => {
	return /^[a-f0-9]{40}$/.test(value);
};
