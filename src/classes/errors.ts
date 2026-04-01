// Source: https://stackoverflow.com/questions/31626231/custom-error-class-in-typescript

export enum ErrorType {
	HTTP_REQUEST_ERROR,
	NOT_AUTHENTICATED_ERROR,
}

/**
 * Thrown when a server API ID is required but not provided
 */
export class MissingServerApiIdError extends Error {
	constructor(msg = "A server API ID is required for this action") {
		super(msg);
		Object.setPrototypeOf(this, MissingServerApiIdError.prototype);
	}
}

/**
 * Thrown when a server identifier is invalid
 */
export class InvalidServerIdError extends Error {
	constructor(msg = "Invalid server identifier") {
		super(msg);
		Object.setPrototypeOf(this, InvalidServerIdError.prototype);
	}
}

/**
 * Thrown when a library parsing error occurs - GitHub issues should be opened for these
 */
export class LibraryParsingError extends Error {
	constructor(msg: string) {
		super(msg);
		Object.setPrototypeOf(this, LibraryParsingError.prototype);
	}
}

/**
 * Additional information about the error, included in API responses.
 * If the value is `null`, that means the error originated from the client
 * internally and *not* from the API.
 */
export type APIBody = null | Record<string, unknown>;

/**
 * Base error class for all CFTools API errors
 */
export class HTTPRequestError extends Error {
	public type = ErrorType.HTTP_REQUEST_ERROR;
	constructor(
		public statusCode: number,
		msg: string,
		public body: APIBody,
	) {
		const resolvedMessage = `${statusCode} - ${msg} - ${JSON.stringify(body)}`;
		super(resolvedMessage);
		Object.setPrototypeOf(this, HTTPRequestError.prototype);
	}
}

/**
 * Thrown when an invalid HTTP method is used
 */
export class InvalidMethodError extends HTTPRequestError {
	constructor(body: APIBody, msg = "Invalid HTTP method") {
		super(400, msg, body);
		Object.setPrototypeOf(this, InvalidMethodError.prototype);
	}
}

/**
 * Thrown when a required parameter is missing
 */
export class ParameterRequiredError extends HTTPRequestError {
	constructor(body: APIBody, msg = "A required parameter is missing") {
		super(400, msg, body);
		Object.setPrototypeOf(this, ParameterRequiredError.prototype);
	}
}

/**
 * Thrown when a supplied argument failed type validation
 */
export class FailedTypeValidationError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "A supplied argument failed the type validation",
	) {
		super(400, msg, body);
		Object.setPrototypeOf(this, FailedTypeValidationError.prototype);
	}
}

/**
 * Thrown when a supplied option is not available for the selected route
 */
export class InvalidOptionError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "One of the supplied option is not available for the selected route.",
	) {
		super(400, msg, body);
		Object.setPrototypeOf(this, InvalidOptionError.prototype);
	}
}

/**
 * Thrown when the maximum length of a parameter has been exceeded
 */
export class MaxLengthExceededError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The maximum length of a parameter has been exceeded",
	) {
		super(400, msg, body);
		Object.setPrototypeOf(this, MaxLengthExceededError.prototype);
	}
}

/**
 * Thrown when the minimum length of a parameter has not been reached
 */
export class MinLengthNotReachedError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The minimum length of a parameter has not been reached",
	) {
		super(400, msg, body);
		Object.setPrototypeOf(this, MinLengthNotReachedError.prototype);
	}
}

/**
 * Thrown when the length of a parameter does not match the required length
 */
export class LengthMismatchError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The length of a parameter does not match the required length",
	) {
		super(400, msg, body);
		Object.setPrototypeOf(this, LengthMismatchError.prototype);
	}
}

/**
 * Thrown when attempted creation of an entity fails as the same or a similar entity already exists
 */
export class DuplicateEntryError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The attempted creation of an entity failed as the same or a similar entity already exists.",
	) {
		super(400, msg, body);
		Object.setPrototypeOf(this, DuplicateEntryError.prototype);
	}
}

/**
 * Thrown when the client is not authenticated to the CFTools API
 */
export class LoginRequiredError extends HTTPRequestError {
	public type = ErrorType.NOT_AUTHENTICATED_ERROR;
	constructor(body: APIBody, msg = "The CFTools client is not authenticated") {
		super(401, msg, body);
		Object.setPrototypeOf(this, LoginRequiredError.prototype);
	}
}

/**
 * Thrown when the supplied token has been invalidated and must be regenerated
 */
export class TokenRegenerationRequiredError extends LoginRequiredError {
	constructor(
		body: APIBody,
		msg = "The supplied token has been invalidated and must be regenerated.",
	) {
		super(body, msg);
		Object.setPrototypeOf(this, TokenRegenerationRequiredError.prototype);
	}
}

/**
 * Thrown when the supplied secret does not match the current application secret
 */
export class BadSecretError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The supplied secret does not match the current application secret.",
	) {
		super(403, msg, body);
		Object.setPrototypeOf(this, BadSecretError.prototype);
	}
}

/**
 * Thrown when the supplied token does not match the request identity
 */
export class BadTokenError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The supplied does not match the request identity.",
	) {
		super(403, msg, body);
		Object.setPrototypeOf(this, BadTokenError.prototype);
	}
}

/**
 * Thrown when the supplied token has expired
 */
export class ExpiredTokenError extends HTTPRequestError {
	constructor(body: APIBody, msg = "The supplied token has expired.") {
		super(403, msg, body);
		Object.setPrototypeOf(this, ExpiredTokenError.prototype);
	}
}

/**
 * Thrown when the supplied API key is invalid
 */
export class InvalidAPIKeyError extends HTTPRequestError {
	constructor(body: APIBody, msg = "The supplied API key is invalid.") {
		super(403, msg, body);
		Object.setPrototypeOf(this, InvalidAPIKeyError.prototype);
	}
}

/**
 * Thrown when the supplied token does not have the required grant for the specified action/resource
 */
export class NoGrantError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The supplied token does not have the required grant for the specified action/resource.",
	) {
		super(403, msg, body);
		Object.setPrototypeOf(this, NoGrantError.prototype);
	}
}

/**
 * Thrown when the requested route or resource did not match any known entries
 */
export class NotFoundError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The requested route or resource did not match any known entries.",
	) {
		super(404, msg, body);
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

/**
 * Thrown when the requested resource by the supplied id could not be found
 */
export class InvalidResourceError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The requested resource by the supplied id could not be found.",
	) {
		super(404, msg, body);
		Object.setPrototypeOf(this, InvalidResourceError.prototype);
	}
}

/**
 * Thrown when the requested resource has been found, but the action could
 * not be executed as the respective bucket was not been found or was not configured
 */
export class InvalidBucketError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = [
			"The resource has been found, but the action could not be executed as the respective",
			"bucket was not been found or was not configured.",
		].join(" "),
	) {
		super(404, msg, body);
		Object.setPrototypeOf(this, InvalidBucketError.prototype);
	}
}

/**
 * Thrown when you exceed the allowed rate limit for a route
 */
export class RateLimitError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "You have exceeded the allowed rate limit for this route.",
	) {
		super(429, msg, body);
		Object.setPrototypeOf(this, RateLimitError.prototype);
	}
}

/**
 * Thrown when an internal error occurred. Should this error persist,
 * contact CFTools Cloud support with the supplied "request_id"
 */
export class UnexpectedError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = [
			"An internal error occurred. Should this error persist, contact CFTools",
			'Cloud support with the supplied "request_id".',
		].join(" "),
	) {
		super(500, msg, body);
		Object.setPrototypeOf(this, UnexpectedError.prototype);
	}
}

/**
 * Thrown when the requested action timed out and must be retried
 */
export class TimeoutError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The requested action timed out and must be retried.",
	) {
		super(500, msg, body);
		Object.setPrototypeOf(this, TimeoutError.prototype);
	}
}

/**
 * Thrown when the requested service could not be reached. You must re-attempt your request
 */
export class SystemUnavailableError extends HTTPRequestError {
	constructor(
		body: APIBody,
		msg = "The requested service could not be reached. You must re-attempt your request.",
	) {
		super(503, msg, body);
		Object.setPrototypeOf(this, SystemUnavailableError.prototype);
	}
}
