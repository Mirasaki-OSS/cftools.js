import { defaultLogTag } from "../resolvers/library";
import { AbstractLogger, type LogLevel } from "../types/logger";

export class ConsoleLogger extends AbstractLogger implements AbstractLogger {
	/**
	 * The log level to use for this logger.
	 *
	 * - `off` - Do not log any messages.
	 * - `fatal` - Only log fatal (error) messages.
	 * - `error` - Log all (error) messages (excludes `warn`, `info`, `debug`, and `trace`).
	 * - `warn` - Log all messages except `info`, `debug`, and `trace`.
	 * - `info` - Log all messages except `debug` and `trace`.
	 * - `debug` - Log all messages except `trace`.
	 * - `trace` - Log all messages.
	 *
	 * @see {@link LogLevel}
	 * @default 'error'
	 */
	protected logLevel: LogLevel;
	/** The tag to use for this logger. */
	protected logTag: string;

	/**
	 * Creates a new console logger instance, which (as you might expect)
	 * logs messages to the console.
	 * @param logLevel The log level to use for this logger, defaults to `'error'`.
	 * @param logTag The tag to use for this logger, defaults to this libraries (short) user agent.
	 * @see {@link LogLevel}
	 */
	constructor(logLevel: LogLevel = "error", logTag = defaultLogTag) {
		super();
		this.logLevel = logLevel;
		this.logTag = logTag;
	}

	/** @inheritdoc */
	public info(...args: unknown[]): void {
		if (!this.shouldLog("info")) {
			return;
		}
		console.info(this.formatMessage("info", ...args));
	}

	/** @inheritdoc */
	public warn(...args: unknown[]): void {
		if (!this.shouldLog("warn")) {
			return;
		}
		console.warn(this.formatMessage("warn", ...args));
	}

	/** @inheritdoc */
	public error(...args: unknown[]): void {
		if (!this.shouldLog("error")) {
			return;
		}
		console.error(this.formatMessage("error", ...args));
	}

	/** @inheritdoc */
	public debug(...args: unknown[]): void {
		if (!this.shouldLog("debug")) {
			return;
		}
		console.debug(this.formatMessage("debug", ...args));
	}

	/** @inheritdoc */
	public trace(...args: unknown[]): void {
		if (!this.shouldLog("trace")) {
			return;
		}
		console.trace(this.formatMessage("trace", ...args));
	}

	/** @inheritdoc */
	public fatal(...args: unknown[]): void {
		if (!this.shouldLog("fatal")) {
			return;
		}
		console.error(this.formatMessage("fatal", ...args));
	}
}
