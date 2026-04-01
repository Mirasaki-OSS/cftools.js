import { expect } from "chai";
import type { LogLevel } from "../src";
import { getClient } from "./client";

const logLevel: LogLevel = "error";
const client = getClient(logLevel);

describe("Authenticating", () => {
	it("should initially be unauthenticated", () => {
		expect(client.authProvider.authenticated).to.equal(false);
	});

	it("should throw when getting auth headers", () => {
		expect(() => client.authProvider.getHeaders()).to.throw(
			"The CFTools client is not authenticated",
		);
	});

	it("should be marked as needing refresh", () => {
		expect(client.authProvider.shouldRefresh()).to.equal(true);
	});

	it("should authenticate", async () => {
		await client.authenticate();
		expect(client.authProvider.authenticated).to.equal(true);
		expect(client.authProvider.authenticationToken).to.not.be.undefined;
		expect(client.authProvider.issuedAt).to.not.be.undefined;
		expect(client.authProvider.expiresAt).to.not.be.undefined;
	});

	it("should provide auth headers", () => {
		if (client.authProvider.enterpriseToken) {
			expect(client.authProvider.getHeaders()).to.deep.equal({
				Authorization: `Bearer ${client.authProvider.authenticationToken}`,
				"X-Enterprise-Access-Token": client.authProvider.enterpriseToken,
			});
		} else {
			expect(client.authProvider.getHeaders()).to.deep.equal({
				Authorization: `Bearer ${client.authProvider.authenticationToken}`,
			});
		}
	});

	it("should not need refresh", () => {
		expect(client.authProvider.shouldRefresh()).to.equal(false);
	});

	it("should need refresh after unsetting values", async () => {
		// @ts-expect-error - delete token for testing
		delete client.authProvider.authenticationToken;
		client.authProvider.authenticated = false;
		client.authProvider.issuedAt = null;
		client.authProvider.expiresAt = null;
		expect(client.authProvider.shouldRefresh()).to.equal(true);
	});

	it("should refresh", async () => {
		await client.authProvider.performRefresh();
		expect(client.authProvider.authenticated).to.equal(true);
		expect(client.authProvider.authenticationToken).to.not.be.undefined;
		expect(client.authProvider.issuedAt).to.not.be.undefined;
		expect(client.authProvider.expiresAt).to.not.be.undefined;
	});
});
