import { defaultLogTag } from "../resolvers/library";

export type LogLevel =
	| "off"
	| "info"
	| "warn"
	| "error"
	| "debug"
	| "trace"
	| "fatal";

export abstract class AbstractLogger {
	protected logLevel: LogLevel;
	protected logTag: string;

	private static readonly logLevelPriority: Record<LogLevel, number> = {
		off: -1,
		fatal: 0,
		error: 1,
		warn: 2,
		info: 3,
		debug: 4,
		trace: 5,
	};

	protected constructor(logLevel: LogLevel = "error", logTag = defaultLogTag) {
		this.logLevel = logLevel;
		this.logTag = logTag;
		this.shouldLog = this.shouldLog.bind(this);
		this.info = this.info.bind(this);
		this.warn = this.warn.bind(this);
		this.error = this.error.bind(this);
		this.debug = this.debug.bind(this);
		this.trace = this.trace.bind(this);
		this.fatal = this.fatal.bind(this);
	}

	/**
	 * Checks whether a log level should be logged based on the current log level.
	 * @param level The log level to check
	 * @returns Whether the log level should be logged
	 */
	protected shouldLog(level: LogLevel): boolean {
		return (
			AbstractLogger.logLevelPriority[level] <=
			AbstractLogger.logLevelPriority[this.logLevel]
		);
	}

	/**
	 * Formats a message for logging, including the log level and log tag.
	 * @param level The log level to use
	 * @param args The arguments to log
	 * @returns The formatted message
	 */
	protected formatMessage(level: LogLevel, ...args: unknown[]): string {
		return `${new Date().toISOString()} [${this.logTag}] ${level.toUpperCase()} - ${JSON.stringify(args)}`;
	}

	/**
	 * Extends the current logger with a new log tag.
	 * @param logTag The new log tag to use
	 * @returns A new logger instance with the new log tag
	 */
	public extend(logTag: string): AbstractLogger {
		// biome-ignore lint/suspicious/noShadowRestrictedNames: This is intentional to allow for dynamic logger classes.
		const constructor = this.constructor as new (
			logLevel: LogLevel,
			logTag: string,
		) => AbstractLogger;
		return new constructor(this.logLevel, `${this.logTag}/${logTag}`);
	}

	/**
	 * General/generic information to log, typically for info that you want to have always available,
	 * but not necessarily important to the user. This is the default log level.
	 */
	public abstract info(...args: unknown[]): void;
	/**
	 * Warnings are for information that is important to the user, but not necessarily critical.
	 */
	public abstract warn(...args: unknown[]): void;
	/**
	 * Errors are for information that is critical and should be addressed immediately.
	 */
	public abstract error(...args: unknown[]): void;
	/**
	 * Debug logs are for information that is useful for debugging issues.
	 */
	public abstract debug(...args: unknown[]): void;
	/**
	 * Trace logs are for information that is useful for tracing the flow of a program.
	 */
	public abstract trace(...args: unknown[]): void;
	/**
	 * Fatal logs are for information that is critical and should be addressed immediately.
	 */
	public abstract fatal(...args: unknown[]): void;
}
