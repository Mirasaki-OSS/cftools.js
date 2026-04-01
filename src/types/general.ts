export enum Game {
	DayZ = 1,
}

export enum LeaderboardSort {
	Ascending = 1,
	Descending = -1,
}

export enum LeaderboardStat {
	Kills = "kills",
	Deaths = "deaths",
	Suicides = "suicides",
	Playtime = "playtime",
	LongestKill = "longest_kill",
	LongestShot = "longest_shot",
	KDRatio = "kdratio",
}

export enum GameServerQueryError {
	/**
	 * Everything ok.
	 */
	NONE = "GameServerQueryError.NONE",
	/**
	 * Generic failure, like parsing or an invalid integrity check. Fallback for
	 * anything else as well.
	 */
	GENERIC = "GameServerQueryError.GENERIC",
	/**
	 * Any sort of timeout after the server acknowledged at least one packet.
	 * Eg. a2s rules times out after info worked
	 */
	TIMEOUT = "GameServerQueryError.TIMEOUT",
	/**
	 * Server is sending wrong information about its own IP address
	 * (unrelated to player count spoofing)
	 */
	SPOOFED = "GameServerQueryError.SPOOFED",
	/**
	 * Either A2S rules is unsupported, or the Server has not been updated
	 * to any 1.* version eg. pirated servers
	 */
	UNSUPORTED_VERSION = "GameServerQueryError.UNSUPORTED_VERSION",
	/**
	 * No connection can be established as server actively refuses it.
	 */
	CONNECTION_FAILED = "GameServerQueryError.CONNECTION_FAILED",
}

/**
 * Enumeration of all possible actions that can be performed on a GameLabs server.
 */
export enum GameLabsActionCode {
	CFCloud_TeleportPlayer = "CFCloud_TeleportPlayer",
	CFCloud_HealPlayer = "CFCloud_HealPlayer",
	CFCloud_KillPlayer = "CFCloud_KillPlayer",
	CFCloud_SpawnPlayerItem = "CFCloud_SpawnPlayerItem",
	CFCloud_StripPlayer = "CFCloud_StripPlayer",
	CFCloud_ExplodePlayer = "CFCloud_ExplodePlayer",
	CFCloud_DeleteVehicle = "CFCloud_DeleteVehicle",
	CFCloud_KillVehicleEngine = "CFCloud_KillVehicleEngine",
	CFCloud_RefuelVehicle = "CFCloud_RefuelVehicle",
	CFCloud_RepairVehicle = "CFCloud_RepairVehicle",
	CFCloud_VehicleExplode = "CFCloud_VehicleExplode",
	CFCloud_UnstuckVehicle = "CFCloud_UnstuckVehicle",
	CFCloud_WorldTime = "CFCloud_WorldTime",
	CFCloud_WorldWeather = "CFCloud_WorldWeather",
	CFCloud_WorldWeatherSunny = "CFCloud_WorldWeatherSunny",
	CFCloud_WorldWipeAI = "CFCloud_WorldWipeAI",
	CFCloud_WorldWipeVehicles = "CFCloud_WorldWipeVehicles",
	CFCloud_SpawnItemWorld = "CFCloud_SpawnItemWorld",
	CFCloud_ObjectDelete = "CFCloud_ObjectDelete",
	CFCloud_TerritoryFlagClear = "CFCloud_TerritoryFlagClear",
	WRDG_FlipTransport_GL = "WRDG_FlipTransport_GL",
	WRDG_PushTransport_GL = "WRDG_PushTransport_GL",
	LB_Gamelabs_MutePlayer = "LB_Gamelabs_MutePlayer",
	LB_Gamelabs_UnmutePlayer = "LB_Gamelabs_UnmutePlayer",
}
