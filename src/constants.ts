export class UnitConstants {
	public static readonly NS_IN_ONE_MS = 1000000;
	public static readonly MS_IN_ONE_S = 1000;
	public static readonly S_IN_ONE_M = 60;
	public static readonly M_IN_ONE_H = 60;
	public static readonly H_IN_ONE_D = 24;
	public static readonly D_IN_ONE_W = 7;
	public static readonly W_IN_ONE_Y = 52;

	public static readonly NS_IN_ONE_S =
		UnitConstants.NS_IN_ONE_MS * UnitConstants.MS_IN_ONE_S;
	public static readonly NS_IN_ONE_M =
		UnitConstants.NS_IN_ONE_S * UnitConstants.S_IN_ONE_M;
	public static readonly NS_IN_ONE_H =
		UnitConstants.NS_IN_ONE_M * UnitConstants.M_IN_ONE_H;
	public static readonly NS_IN_ONE_D =
		UnitConstants.NS_IN_ONE_H * UnitConstants.H_IN_ONE_D;
	public static readonly NS_IN_ONE_W =
		UnitConstants.NS_IN_ONE_D * UnitConstants.D_IN_ONE_W;
	public static readonly NS_IN_ONE_Y =
		UnitConstants.NS_IN_ONE_W * UnitConstants.W_IN_ONE_Y;

	public static readonly MS_IN_ONE_M =
		UnitConstants.MS_IN_ONE_S * UnitConstants.S_IN_ONE_M;
	public static readonly MS_IN_ONE_H =
		UnitConstants.MS_IN_ONE_M * UnitConstants.M_IN_ONE_H;
	public static readonly MS_IN_ONE_D =
		UnitConstants.MS_IN_ONE_H * UnitConstants.H_IN_ONE_D;
	public static readonly MS_IN_ONE_W =
		UnitConstants.MS_IN_ONE_D * UnitConstants.D_IN_ONE_W;
	public static readonly MS_IN_ONE_Y =
		UnitConstants.MS_IN_ONE_W * UnitConstants.W_IN_ONE_Y;

	public static readonly S_IN_ONE_H =
		UnitConstants.S_IN_ONE_M * UnitConstants.M_IN_ONE_H;
	public static readonly S_IN_ONE_D =
		UnitConstants.S_IN_ONE_H * UnitConstants.H_IN_ONE_D;
	public static readonly S_IN_ONE_W =
		UnitConstants.S_IN_ONE_D * UnitConstants.D_IN_ONE_W;
	public static readonly S_IN_ONE_Y =
		UnitConstants.S_IN_ONE_W * UnitConstants.W_IN_ONE_Y;

	public static readonly M_IN_ONE_D =
		UnitConstants.M_IN_ONE_H * UnitConstants.H_IN_ONE_D;
	public static readonly M_IN_ONE_W =
		UnitConstants.M_IN_ONE_D * UnitConstants.D_IN_ONE_W;
	public static readonly M_IN_ONE_Y =
		UnitConstants.M_IN_ONE_W * UnitConstants.W_IN_ONE_Y;

	public static readonly H_IN_ONE_W =
		UnitConstants.H_IN_ONE_D * UnitConstants.D_IN_ONE_W;
	public static readonly H_IN_ONE_Y =
		UnitConstants.H_IN_ONE_W * UnitConstants.W_IN_ONE_Y;

	public static readonly D_IN_ONE_Y =
		UnitConstants.D_IN_ONE_W * UnitConstants.W_IN_ONE_Y;
}

export const CFTOOLS_BASE_URL = "https://app.cftools.cloud";
export const API_BASE_URL = "https://data.cftools.cloud";
export const ENTERPRISE_BASE_URL = "https://epr-data.cftools.cloud";
export const V1_API_BASE_URL = `${API_BASE_URL}/v1`;
export const ENTERPRISE_V1_API_BASE_URL = `${ENTERPRISE_BASE_URL}/v1`;
export const V2_API_BASE_URL = `${API_BASE_URL}/v2`;
export const ENTERPRISE_V2_API_BASE_URL = `${ENTERPRISE_BASE_URL}/v2`;
export enum API_VERSION {
	V1 = "v1",
	V2 = "v2",
}

export const AUTHENTICATION_TOKEN_VALIDITY = UnitConstants.MS_IN_ONE_D;
export const AUTHENTICATION_TOKEN_VALIDITY_BUFFER = UnitConstants.MS_IN_ONE_H;
export const AUTHENTICATION_TOKEN_REFRESH_INTERVAL =
	AUTHENTICATION_TOKEN_VALIDITY - AUTHENTICATION_TOKEN_VALIDITY_BUFFER;
