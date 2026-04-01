/**
 * Headers required for making authenticated requests to the CFTools API.
 */
export type AuthHeaders = {
	Authorization?: string;
	"X-Enterprise-Access-Token"?: string;
};

/**
 * Data required to determine whether the client is (still) authenticated.
 */
export type AuthenticationData = {
	issuedAt: Date | null;
	expiresAt: Date | null;
};

/**
 * Authentication returned by the CFTools API.
 */
export type ClientAuthentication = AuthenticationData & {
	token: string;
};

/**
 * Data required to authenticate the client to the CFTools API.
 */
export type ClientAuthenticationData = {
	userAgent?: string;
	applicationId: string;
	applicationSecret: string;
	serverApiId?: string;
	enterpriseToken?: string;
};
