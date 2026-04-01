export type BaseResponse = {
	/** Whether the request was successful or not */
	status: boolean;
	/** The error message if the request was not successful */
	error?: string;
};

/**
 * Note: This type is used to track client responses in the IDE.
 */
export type ClientBaseResponse<T> = T;

export type BaseGrantResource = {
	id: string;
	identifier: string;
	object_id: string;
};

export type BaseGrant = {
	created_at: string;
	resource: BaseGrantResource;
};
