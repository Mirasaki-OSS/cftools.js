import pkg from "../../package.json";

/**
 * The user agent to use for requests
 */
export const minimalUserAgent = (applicationId: string | null) =>
	`${pkg.name}/${pkg.version}@${applicationId}`;
export const userAgent = (applicationId: string) =>
	`${minimalUserAgent(applicationId)} (${pkg.repository.url})`;

/**
 * The default log tag to use for logging
 */
export const defaultLogTag = minimalUserAgent(null);
