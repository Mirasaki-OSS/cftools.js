import {
	BadSecretError,
	BadTokenError,
	DuplicateEntryError,
	ExpiredTokenError,
	FailedTypeValidationError,
	HTTPRequestError,
	InvalidAPIKeyError,
	InvalidBucketError,
	InvalidOptionError,
	InvalidResourceError,
	InvalidServerIdError,
	LengthMismatchError,
	LibraryParsingError,
	LoginRequiredError,
	MaxLengthExceededError,
	MinLengthNotReachedError,
	MissingServerApiIdError,
	NoGrantError,
	NotFoundError,
	ParameterRequiredError,
	RateLimitError,
	SystemUnavailableError,
	TimeoutError,
	TokenRegenerationRequiredError,
	UnexpectedError,
} from "./errors";

export const isMissingServerApiIdError = (
	err: unknown,
): err is MissingServerApiIdError => err instanceof MissingServerApiIdError;

export const isInvalidServerIdError = (
	err: unknown,
): err is InvalidServerIdError => err instanceof InvalidServerIdError;

export const isLibraryParsingError = (
	err: unknown,
): err is LibraryParsingError => err instanceof LibraryParsingError;

export const isHTTPRequestError = (err: unknown): err is HTTPRequestError =>
	err instanceof HTTPRequestError;

export const isParameterRequiredError = (
	err: unknown,
): err is ParameterRequiredError => err instanceof ParameterRequiredError;

export const isFailedTypeValidationError = (
	err: unknown,
): err is FailedTypeValidationError => err instanceof FailedTypeValidationError;

export const isInvalidOptionError = (err: unknown): err is InvalidOptionError =>
	err instanceof InvalidOptionError;

export const isMaxLengthExceededError = (
	err: unknown,
): err is MaxLengthExceededError => err instanceof MaxLengthExceededError;

export const isMinLengthNotReachedError = (
	err: unknown,
): err is MinLengthNotReachedError => err instanceof MinLengthNotReachedError;

export const isLengthMismatchError = (
	err: unknown,
): err is LengthMismatchError => err instanceof LengthMismatchError;

export const isDuplicateEntryError = (
	err: unknown,
): err is DuplicateEntryError => err instanceof DuplicateEntryError;

export const isLoginRequiredError = (err: unknown): err is LoginRequiredError =>
	err instanceof LoginRequiredError;

export const isTokenRegenerationRequiredError = (
	err: unknown,
): err is TokenRegenerationRequiredError =>
	err instanceof TokenRegenerationRequiredError;

export const isBadSecretError = (err: unknown): err is BadSecretError =>
	err instanceof BadSecretError;

export const isBadTokenError = (err: unknown): err is BadTokenError =>
	err instanceof BadTokenError;

export const isExpiredTokenError = (err: unknown): err is ExpiredTokenError =>
	err instanceof ExpiredTokenError;

export const isInvalidAPIKeyError = (err: unknown): err is InvalidAPIKeyError =>
	err instanceof InvalidAPIKeyError;

export const isNoGrantError = (err: unknown): err is NoGrantError =>
	err instanceof NoGrantError;

export const isNotFoundError = (err: unknown): err is NotFoundError =>
	err instanceof NotFoundError;

export const isInvalidResourceError = (
	err: unknown,
): err is InvalidResourceError => err instanceof InvalidResourceError;

export const isInvalidBucketError = (err: unknown): err is InvalidBucketError =>
	err instanceof InvalidBucketError;

export const isRateLimitError = (err: unknown): err is RateLimitError =>
	err instanceof RateLimitError;

export const isUnexpectedError = (err: unknown): err is UnexpectedError =>
	err instanceof UnexpectedError;

export const isTimeoutError = (err: unknown): err is TimeoutError =>
	err instanceof TimeoutError;

export const isSystemUnavailableError = (
	err: unknown,
): err is SystemUnavailableError => err instanceof SystemUnavailableError;
