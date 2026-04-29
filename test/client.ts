import "dotenv/config";

import { CFToolsClient } from "../src/classes/client";
import { ConsoleLogger } from "../src/classes/logger";
import type { LogLevel } from "../src/types/logger";
import { getEnv } from './env';

export const getClient = (logLevel: LogLevel, requestTimeout = 1500) => {
	const env = getEnv();
	const logger = new ConsoleLogger(logLevel);
	const client = new CFToolsClient(
		{
			applicationId: env.CFTOOLS_APPLICATION_ID,
			applicationSecret: env.CFTOOLS_APPLICATION_SECRET,
			enterpriseToken: env.CFTOOLS_ENTERPRISE_TOKEN,
			serverApiId: env.CFTOOLS_SERVER_API_ID,
			userAgent: "CFTools API Client / Test Suite",
		},
		{ logger, requestTimeout, cacheConfiguration: {} },
	);

	return client;
};
