import type { BaseResponse, ClientBaseResponse } from "./base";

export type LookupUserResponse = BaseResponse & {
	cftools_id: string;
	notice?: string;
};

export type ClientLookupUserResponse = ClientBaseResponse<{
	cftoolsId: string;
	/**
	 * When the `useAccountCreationAPI` parameter is used, this field
	 * will include the status of the account creation request.
	 */
	notice?: string;
}>;
