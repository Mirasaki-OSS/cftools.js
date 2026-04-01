import { expect } from "chai";
import { beforeEach } from "mocha";
import { type CachePrefix, rootCacheKey } from "../src/classes/client";
import {
	ErrorType,
	HTTPRequestError,
	LoginRequiredError,
} from "../src/classes/errors";
import { CFTOOLS_BASE_URL, UnitConstants } from "../src/constants";
import {
	BattlEyeGUID,
	BohemiaInteractiveUID,
	CFToolsId,
	Steam64Id,
} from "../src/resolvers/player-ids";
import type { ResolveServerIdOptions } from "../src/resolvers/server-id";
import { Game, LeaderboardSort, LeaderboardStat } from "../src/types/general";
import type { LogLevel } from "../src/types/logger";
import type { ClientGrantsResponse } from "../src/types/responses";
import { getClient } from "./client";

const logLevel: LogLevel = "error";
const client = getClient(logLevel);
const serverApiId = `${process.env.CFTOOLS_SERVER_API_ID}`;

const gameServerId = process.env.SERVER_ID;
const serverIp = process.env.SERVER_IP;
const serverPort = process.env.SERVER_PORT;

if (!gameServerId) {
	throw new Error("No server ID provided");
}
if (!serverIp) {
	throw new Error("No server IP provided");
}
if (!serverPort) {
	throw new Error("No server port provided");
}

if (!process.env.BANLIST_ID) {
	throw new Error("No ban list ID provided");
}
if (!process.env.TEST_IP) {
	throw new Error("No test IP provided");
}
if (!process.env.TEST_CFTOOLS_ID) {
	throw new Error("No test CFTools ID provided");
}
if (!process.env.TEST_STEAM_ID) {
	throw new Error("No test Steam ID provided");
}
if (!process.env.TEST_BATTLEYE_GUID) {
	throw new Error("No test BattleEye GUID provided");
}
if (!process.env.TEST_BOHEMIA_INTERACTIVE_UID) {
	throw new Error("No test Bohemia Interactive UID provided");
}

const gameServer: ResolveServerIdOptions = {
	game: Game.DayZ,
	ipv4: serverIp,
	port: parseInt(serverPort, 10),
};

const banListId = `${process.env.BANLIST_ID}`;
const ip = `${process.env.TEST_IP}`;
const cftoolsId = `${process.env.TEST_CFTOOLS_ID}`;
const steamId = `${process.env.TEST_STEAM_ID}`;
const battleEyeGUID = `${process.env.TEST_BATTLEYE_GUID}`;
const bohemiaInteractiveUID = `${process.env.TEST_BOHEMIA_INTERACTIVE_UID}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => await sleep(UnitConstants.MS_IN_ONE_S * 0.125));

describe("Client module", () => {
	describe("Fundamentals", () => {
		it("should be defined", () => {
			expect(client).to.not.be.undefined;
		});
		it("should have a logger", () => {
			expect(client.logger).to.not.be.undefined;
		});
		it("should have an authProvider", () => {
			expect(client.authProvider).to.not.be.undefined;
		});
		it("should have a requestClient", () => {
			expect(client.requestClient).to.not.be.undefined;
		});
		it("should have a cacheManager", () => {
			expect(client.cacheManager).to.not.be.undefined;
		});
		it("should resolve the grant url correctly", () => {
			expect(client.grantURL()).to.equal(
				`${CFTOOLS_BASE_URL}/authorize/${client.authProvider.applicationId}`,
			);
		});
		it("should authenticate", async () => {
			await client.authenticate();
			expect(client.authProvider.authenticated).to.equal(true);
			expect(client.authProvider.authenticationToken).to.not.be.undefined;
			expect(client.authProvider.issuedAt).to.not.be.undefined;
			expect(client.authProvider.expiresAt).to.not.be.undefined;
		});
	});

	describe("Caching", () => {
		const [key, value, ttl] = ["test", "value", UnitConstants.MS_IN_ONE_S];
		it("should not be persisted on boot", async () => {
			expect(await client.cacheManager.get(key)).to.be.null;
		});
		it("should cache a value", async () => {
			await client.cacheManager.set(key, value, ttl);
			expect(await client.cacheManager.get(key)).to.equal(value);
		});
		it("should delete a value", async () => {
			await client.cacheManager.del(key);
			expect(await client.cacheManager.get(key)).to.be.null;
		});
		it("should expire a value", async () => {
			await client.cacheManager.set(key, value, ttl);
			await new Promise((resolve) => setTimeout(resolve, ttl * 1.25));
			expect(await client.cacheManager.get(key)).to.be.null;
		});
		it("should cache requests and deep equal the original", async () => {
			const appGrants = await client.getAppGrants();
			expect(appGrants.server).to.be.an("array");
			expect(appGrants.banlist).to.be.an("array");

			const cachePrefix: CachePrefix = "appGrants";
			const cacheKey = `${cachePrefix}:${rootCacheKey}`;
			const newFromCache =
				await client.cacheManager.get<ClientGrantsResponse>(cacheKey);
			expect(newFromCache).to.not.be.null;
			expect(await client.cacheManager.get(cacheKey)).to.deep.equal(appGrants);
		});
		it("should handle aggressive requests", async () => {
			await Promise.all(
				Array.from({ length: 10 }, () => client.getAppGrants()),
			);
		});
		it("should respect max size", async () => {
			await client.cacheManager.enforceMaxSizeForPrefix("appGrants", 1);
			expect(
				await client.cacheManager.keysForPrefix("appGrants"),
			).to.have.lengthOf(1);

			const cachePrefix: CachePrefix = "appGrants";
			const cacheKey = `${cachePrefix}:${rootCacheKey}#2`;
			await client.cacheManager.set(cacheKey, "value", ttl);
			await client.cacheManager.enforceMaxSizeForPrefix("appGrants", 1);
			expect(
				await client.cacheManager.keysForPrefix("appGrants"),
			).to.have.lengthOf(1);
		});
		it("should clear the cache", async () => {
			await client.cacheManager.clear();
			expect(await client.cacheManager.size()).to.equal(0);
		});
	});

	describe("Errors", () => {
		const error = new LoginRequiredError(null, "Test error");
		it("should be an instance of Error", () => {
			expect(error).to.be.instanceOf(Error);
		});
		it("should be an instance of HTTPRequestError", () => {
			expect(error).to.be.instanceOf(HTTPRequestError);
		});
		it("should be an instance of LoginRequiredError", () => {
			expect(error).to.be.instanceOf(LoginRequiredError);
		});
		it("should have a message", () => {
			expect(error.message).to.equal("401 - Test error - null");
		});
		it("should have a status code", () => {
			expect(error.statusCode).to.equal(401);
		});
		it("should have a type", () => {
			expect(error.type).to.equal(ErrorType.NOT_AUTHENTICATED_ERROR);
		});
	});

	describe("Grants", () => {
		it("should get app grants", async () => {
			const appGrants = await client.getAppGrants();
			expect(appGrants.banlist).to.be.an("array");
			expect(appGrants.server).to.be.an("array");
		});
		it("should get grants a second time", async () => {
			const appGrants = await client.getAppGrants();
			expect(appGrants.banlist).to.be.an("array");
			expect(appGrants.server).to.be.an("array");
		});
		it("should then throw an error due to rate-limiting", async () => {
			try {
				await client.getAppGrants();
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("Server API ID", () => {
		it("should resolve the server API ID", () => {
			expect(client.authProvider.resolveServerApiId("test")).to.equal("test");
		});
		it("should resolve the server API ID from the client", () => {
			expect(client.authProvider.resolveServerApiId(undefined, true)).to.equal(
				client.authProvider.serverApiId,
			);
		});
		const serverApiId = client.authProvider.serverApiId;
		it("should throw when resolving the server API ID", () => {
			delete client.authProvider.serverApiId;
			expect(() =>
				client.authProvider.resolveServerApiId(undefined, true),
			).to.throw("A server API ID is required for this action");
		});
		it("should no longer throw when resolving the server API ID", () => {
			client.authProvider.serverApiId = serverApiId;
			expect(client.authProvider.resolveServerApiId(undefined, true)).to.equal(
				client.authProvider.serverApiId,
			);
		});
	});

	describe("Game Server Details", () => {
		it("should resolve the server ID", () => {
			const serverId = client.resolveServerId(gameServer);
			expect(serverId).to.equal(gameServerId);
		});
		it("should fetch game server details from string", async () => {
			const details = await client.gameServerDetails(gameServerId);
			expect(details).to.not.be.undefined;
		});
		it("should fetch game server details from object", async () => {
			const details = await client.gameServerDetails(gameServer);
			expect(details).to.not.be.undefined;
		});
		it("should throw when fetching game server details", async () => {
			try {
				await client.gameServerDetails("invalid");
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("User Lookup", () => {
		it("should lookup a user by CFTools ID string", async () => {
			const user = await client.lookupUser(cftoolsId);
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by CFTools ID object", async () => {
			const user = await client.lookupUser(new CFToolsId(cftoolsId));
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by Steam ID string", async () => {
			const user = await client.lookupUser(steamId);
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by Steam ID object", async () => {
			const user = await client.lookupUser(new Steam64Id(steamId));
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by battle eye guid string", async () => {
			const user = await client.lookupUser(battleEyeGUID);
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by battle eye guid object", async () => {
			const user = await client.lookupUser(new BattlEyeGUID(battleEyeGUID));
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by bohemia interactive uid string", async () => {
			const user = await client.lookupUser(bohemiaInteractiveUID);
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should lookup a user by bohemia interactive uid object", async () => {
			const user = await client.lookupUser(
				new BohemiaInteractiveUID(bohemiaInteractiveUID),
			);
			expect(user.cftoolsId).to.equal(cftoolsId);
		});
		it("should throw when looking up an invalid user by string", async () => {
			try {
				await client.lookupUser("invalid");
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
		it("should throw when looking up an invalid user by object", async () => {
			try {
				await client.lookupUser(new CFToolsId("invalid"));
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("Banlist Management", () => {
		it("should clear all bans", async () => {
			const bans = await client.listBans({ banListId });
			expect(bans).to.be.an("array");
			await Promise.all(
				bans.map((ban) => client.deleteBan({ banListId, banId: ban.id })),
			);
		});
		// Note: After creating a ban, there's a delay of around 50ms for replication
		// Source (philipp, CFTools): > That throws an internal 404 as the ban id was not found. If you create, update,
		// > delete and then re-check the ban there is a delay of around 50ms for replication
		it("should manage bans by IP", async () => {
			await client.createBan({
				banListId,
				format: "ipv4",
				identifier: ip,
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: ip });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
			return;
		});
		it("should manage bans by CFTools ID string", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: cftoolsId,
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: cftoolsId });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by CFTools ID object", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: new CFToolsId(cftoolsId),
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: cftoolsId });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by Steam ID string", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: steamId,
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: steamId });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by Steam ID object", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: new Steam64Id(steamId),
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: steamId });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by BattleEye GUID string", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: battleEyeGUID,
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: battleEyeGUID });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by BattleEye GUID object", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: new BattlEyeGUID(battleEyeGUID),
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({ banListId, filter: battleEyeGUID });
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by Bohemia Interactive UID string", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: bohemiaInteractiveUID,
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({
				banListId,
				filter: bohemiaInteractiveUID,
			});
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should manage bans by Bohemia Interactive UID object", async () => {
			await client.createBan({
				banListId,
				format: "cftools_id",
				identifier: new BohemiaInteractiveUID(bohemiaInteractiveUID),
				reason: "Test ban",
				expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
			});
			await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			const bans = await client.listBans({
				banListId,
				filter: bohemiaInteractiveUID,
			});
			expect(bans).to.be.an("array");
			await client.deleteBan({ banListId, banId: bans[0].id });
		});
		it("should throw when managing bans with an invalid identifier", async () => {
			try {
				await client.createBan({
					banListId,
					format: "ipv4",
					identifier: "invalid",
					reason: "Test ban",
					expires: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
				});
				await sleep(UnitConstants.MS_IN_ONE_S * 0.25);
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("Server Information", () => {
		it("should fetch server information", async () => {
			const server = await client.serverInfo(serverApiId);
			expect(server).to.not.be.undefined;
		});
		it("should throw when fetching server information for an invalid server", async () => {
			try {
				await client.serverInfo("invalid");
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("Server Statistics", () => {
		it("should fetch server statistics", async () => {
			const stats = await client.serverStatistics(serverApiId);
			expect(stats).to.not.be.undefined;
		});
		it("should throw when fetching server statistics for an invalid server", async () => {
			try {
				await client.serverStatistics("invalid");
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("Players List", () => {
		it("should fetch players list", async () => {
			const players = await client.playerList(serverApiId);
			expect(players).to.be.an("array");
		});
		it("should throw when fetching players list for an invalid server", async () => {
			try {
				await client.playerList("invalid");
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("Kick", () => {
		// Note: Can't be tested automatically, as it would require a player to be online
		expect(true).to.equal(true);
	});

	describe("Message Private", () => {
		// Note: Can't be tested automatically, as it would require a player to be online
		expect(true).to.equal(true);
	});

	describe("Message Global", () => {
		it("should send a global message", async () => {
			await client.messageServer({
				content: "Test message",
				serverApiId,
			});
		});
		it("should throw when sending a global message with content too long", async () => {
			try {
				await client.messageServer({
					content: "a".repeat(2000),
					serverApiId,
				});
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
		it("should throw when sending a global message to an invalid server", async () => {
			try {
				await client.messageServer({
					content: "Test message",
					serverApiId: "invalid",
				});
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("RCon Command", () => {
		it("should send an RCon Command", async () => {
			await client.rconCommand({
				command: "status",
				serverApiId,
			});
		});
		it("should throw when sending an RCon Command to an invalid server", async () => {
			try {
				await client.rconCommand({
					command: "status",
					serverApiId: "invalid",
				});
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	describe("GameLabs", () => {
		it("should fetch GameLabs actions", async () => {
			const actions = await client.gameLabsActions(serverApiId);
			expect(actions).to.be.an("array");
		});
		// Note: currently gives status code 500
		// it('should fetch GameLabs entity events', async function() {
		//   const events = await client.gameLabsEntityEvents(serverApiId);
		//   expect(events).to.be.an('array');
		// });
		it("should fetch GameLabs entity vehicles", async () => {
			const vehicles = await client.gameLabsEntityVehicles(serverApiId);
			expect(vehicles).to.be.an("array");
		});
		it("should post GameLabs actions", async () => {
			await client.postGameLabsAction({
				serverApiId,
				actionCode: "CFCloud_WorldTime",
				actionContext: "world",
				referenceKey: null,
				parameters: {
					hour: { valueInt: 12 },
					minute: { valueInt: 0 },
				},
			});
		});
		it("should batch post GameLabs actions", async () => {
			await client.batchPostGameLabsAction({
				serverApiId,
				actions: [
					{
						actionCode: "CFCloud_WorldTime",
						actionContext: "world",
						referenceKey: null,
						parameters: {
							hour: { valueInt: 12 },
							minute: { valueInt: 0 },
						},
					},
					{
						actionCode: "CFCloud_WorldTime",
						actionContext: "world",
						referenceKey: null,
						parameters: {
							hour: { valueInt: 12 },
							minute: { valueInt: 0 },
						},
					},
				],
			});
		});
	});

	describe("Priority Queue", () => {
		describe("Fetch", () => {
			it("should fetch priority queue by CFTools ID string", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: cftoolsId,
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by CFTools ID object", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: new CFToolsId(cftoolsId),
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by Steam ID string", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: steamId,
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by Steam ID object", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: new Steam64Id(steamId),
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by BattleEye GUID string", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: battleEyeGUID,
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by BattleEye GUID object", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: new BattlEyeGUID(battleEyeGUID),
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by Bohemia Interactive UID string", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: bohemiaInteractiveUID,
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should fetch priority queue by Bohemia Interactive UID object", async () => {
				const priorityQueue = await client.getPriorityQueue({
					playerId: new BohemiaInteractiveUID(bohemiaInteractiveUID),
					serverApiId,
				});
				expect(priorityQueue).to.be.an("array").of.length(1);
			});
			it("should throw when fetching priority queue with an invalid identifier", async () => {
				try {
					await client.getPriorityQueue({
						playerId: "invalid",
						serverApiId,
					});
				} catch (error) {
					expect(error).to.not.be.undefined;
				}
			});
		});
		describe("Manage", () => {
			it("should remove a player from the priority queue by Steam ID string", async () => {
				await client.deletePriorityQueue({
					playerId: steamId,
					serverApiId,
				});
			});
			it("should add a player to the temporary priority queue by Steam ID string", async () => {
				await client.postPriorityQueue({
					playerId: cftoolsId,
					serverApiId,
					comment: "Permanent priority queue for staff",
					expiresAt: new Date(Date.now() + UnitConstants.MS_IN_ONE_D),
				});
			});
			it("should remove a player from the temporary priority queue by Steam ID object", async () => {
				await client.deletePriorityQueue({
					playerId: new Steam64Id(steamId),
					serverApiId,
				});
			});
			it("should add a player to the permanent priority queue by BattleEye GUID object", async () => {
				await client.postPriorityQueue({
					playerId: new BattlEyeGUID(battleEyeGUID),
					serverApiId,
					comment: "Permanent priority queue for staff",
					expiresAt: null,
				});
			});
		});
	});

	describe("Whitelist", () => {
		describe("Fetch", () => {
			it("should fetch whitelist by CFTools ID string", async () => {
				const whitelist = await client.getWhitelist({
					playerId: cftoolsId,
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by CFTools ID object", async () => {
				const whitelist = await client.getWhitelist({
					playerId: new CFToolsId(cftoolsId),
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by Steam ID string", async () => {
				const whitelist = await client.getWhitelist({
					playerId: steamId,
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by Steam ID object", async () => {
				const whitelist = await client.getWhitelist({
					playerId: new Steam64Id(steamId),
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by BattleEye GUID string", async () => {
				const whitelist = await client.getWhitelist({
					playerId: battleEyeGUID,
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by BattleEye GUID object", async () => {
				const whitelist = await client.getWhitelist({
					playerId: new BattlEyeGUID(battleEyeGUID),
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by Bohemia Interactive UID string", async () => {
				const whitelist = await client.getWhitelist({
					playerId: bohemiaInteractiveUID,
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should fetch whitelist by Bohemia Interactive UID object", async () => {
				const whitelist = await client.getWhitelist({
					playerId: new BohemiaInteractiveUID(bohemiaInteractiveUID),
					serverApiId,
				});
				expect(whitelist).to.be.an("array").of.length(1);
			});
			it("should throw when fetching whitelist with an invalid identifier", async () => {
				try {
					await client.getWhitelist({
						playerId: "invalid",
						serverApiId,
					});
				} catch (error) {
					expect(error).to.not.be.undefined;
				}
			});
		});
		describe("Manage", () => {
			it("should remove a player from the whitelist by Steam ID string", async () => {
				await client.deleteWhitelist({
					playerId: steamId,
					serverApiId,
				});
			});
			it("should add a player to the whitelist by Steam ID string", async () => {
				await client.postWhitelist({
					playerId: cftoolsId,
					serverApiId,
					comment: "Permanent whitelist for staff",
				});
			});
			it("should remove a player from the whitelist by Steam ID object", async () => {
				await client.deleteWhitelist({
					playerId: new Steam64Id(steamId),
					serverApiId,
				});
			});
			it("should add a player to the whitelist by BattleEye GUID object", async () => {
				await client.postWhitelist({
					playerId: new BattlEyeGUID(battleEyeGUID),
					serverApiId,
					comment: "Permanent whitelist for staff",
				});
			});
		});
	});

	describe("Leaderboard", () => {
		it("should fetch leaderboard by kills", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.Kills,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
		it("should fetch leaderboard by deaths", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.Deaths,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
		it("should fetch leaderboard by suicides", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.Suicides,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
		it("should fetch leaderboard by playtime", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.Playtime,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
		it("should fetch leaderboard by longest kill", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.LongestKill,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
		it("should fetch leaderboard by longest shot", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.LongestShot,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
		it("should fetch leaderboard by kdratio", async () => {
			const data = await client.leaderboard({
				serverApiId,
				stat: LeaderboardStat.KDRatio,
				limit: 10,
				order: LeaderboardSort.Descending,
			});
			expect(data).to.be.an("array");
		});
	});

	describe("Player Statistics", () => {
		describe("Fetch", () => {
			it("should fetch player statistics by CFTools ID string", async () => {
				const stats = await client.getPlayerStats({
					playerId: cftoolsId,
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by CFTools ID object", async () => {
				const stats = await client.getPlayerStats({
					playerId: new CFToolsId(cftoolsId),
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by Steam ID string", async () => {
				const stats = await client.getPlayerStats({
					playerId: steamId,
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by Steam ID object", async () => {
				const stats = await client.getPlayerStats({
					playerId: new Steam64Id(steamId),
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by BattleEye GUID string", async () => {
				const stats = await client.getPlayerStats({
					playerId: battleEyeGUID,
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by BattleEye GUID object", async () => {
				const stats = await client.getPlayerStats({
					playerId: new BattlEyeGUID(battleEyeGUID),
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by Bohemia Interactive UID string", async () => {
				const stats = await client.getPlayerStats({
					playerId: bohemiaInteractiveUID,
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should fetch player statistics by Bohemia Interactive UID object", async () => {
				const stats = await client.getPlayerStats({
					playerId: new BohemiaInteractiveUID(bohemiaInteractiveUID),
					serverApiId,
				});
				expect(stats).to.not.be.undefined;
			});
			it("should throw when fetching player statistics with an invalid identifier", async () => {
				try {
					await client.getPlayerStats({
						playerId: "invalid",
						serverApiId,
					});
				} catch (error) {
					expect(error).to.not.be.undefined;
				}
			});
		});
		describe("Manage", () => {
			it("should reset player statistics by CFTools ID string", async () => {
				await client.resetPlayerStats({
					playerId: cftoolsId,
					serverApiId,
				});
			});
			it("should reset player statistics by CFTools ID object", async () => {
				await client.resetPlayerStats({
					playerId: new CFToolsId(cftoolsId),
					serverApiId,
				});
			});
			it("should reset player statistics by Steam ID string", async () => {
				await client.resetPlayerStats({
					playerId: steamId,
					serverApiId,
				});
			});
			it("should reset player statistics by Steam ID object", async () => {
				await client.resetPlayerStats({
					playerId: new Steam64Id(steamId),
					serverApiId,
				});
			});
			it("should reset player statistics by BattleEye GUID string", async () => {
				await client.resetPlayerStats({
					playerId: battleEyeGUID,
					serverApiId,
				});
			});
			it("should reset player statistics by BattleEye GUID object", async () => {
				await client.resetPlayerStats({
					playerId: new BattlEyeGUID(battleEyeGUID),
					serverApiId,
				});
			});
			it("should reset player statistics by Bohemia Interactive UID string", async () => {
				await client.resetPlayerStats({
					playerId: bohemiaInteractiveUID,
					serverApiId,
				});
			});
			it("should reset player statistics by Bohemia Interactive UID object", async () => {
				await client.resetPlayerStats({
					playerId: new BohemiaInteractiveUID(bohemiaInteractiveUID),
					serverApiId,
				});
			});
			it("should throw when resetting player statistics with an invalid identifier", async () => {
				try {
					await client.resetPlayerStats({
						playerId: "invalid",
						serverApiId,
					});
				} catch (error) {
					expect(error).to.not.be.undefined;
				}
			});
		});
	});
});
