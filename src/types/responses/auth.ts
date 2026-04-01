import type { BaseResponse } from "./base";

export type AuthenticationResponse = BaseResponse & {
	/** The token that was issued */
	token: string;
	/** The amount of seconds the token is valid for */
	valid_for?: number;
};

// Note: Not actually used, transformed to return as ClientAuthentication
// export type ClientAuthenticationResponse = CamelCasedPropertiesDeep<AuthenticationResponse>;
