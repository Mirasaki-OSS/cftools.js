import type { CamelCasedPropertiesDeep } from "type-fest";
import type { AnyPlayerId } from "../../resolvers/player-ids";
import type { GameLabsActionCode } from "../general";
import type { BaseResponse, ClientBaseResponse } from "./base";
import type { ClientPlayerSession } from "./gsm-list";

export type GameLabsActionParameter = {
	type: "boolean" | "float" | "int" | "string" | "vector";
	description: string;
	displayName: string;
	options: {
		[key: string]: NonNullable<unknown>;
	};
	valueBoolean?: boolean;
	valueFloat?: number;
	valueInt?: number;
	valueString?: string;
	valueVectorX?: number;
	valueVectorY?: number;
	valueVectorZ?: number;
};

export type GameLabsAction = {
	actionCode: GameLabsActionCode | string;
	actionContext: string;
	actionContextFilter: string[];
	actionName: string;
	parameters?: {
		[key: string]: GameLabsActionParameter;
	};
	referenceKey: string;
};

export type GameLabsActionsResponse = BaseResponse & {
	available_actions: GameLabsAction[];
};

export type ClientGameLabsActionsResponse = ClientBaseResponse<
	CamelCasedPropertiesDeep<GameLabsAction>[]
>;

//
// Start Entity Events
//

export type EntityEvent = {
	className: string;
	id: string;
	position: [number, number];
};

export type GameLabsEntityEventsResponse = BaseResponse & {
	entities: EntityEvent[];
};

export type ClientGameLabsEntityEventsResponse = ClientBaseResponse<
	CamelCasedPropertiesDeep<EntityEvent>[]
>;

//
// Start Entity Vehicles
//

export type GameLabsEntityVehicle = {
	className: string;
	health: number;
	id: string;
	position: [number, number];
	speed: number;
};

export type GameLabsEntityVehiclesResponse = BaseResponse & {
	entities: GameLabsEntityVehicle[];
};

export type ClientGameLabsEntityVehiclesResponse = ClientBaseResponse<
	CamelCasedPropertiesDeep<GameLabsEntityVehicle>[]
>;

//
// Start Post Action
//

export type PostGameLabsActionOptions = {
	serverApiId?: string;
	actionCode: GameLabsActionCode | string;
	actionContext: "world" | "player" | "vehicle" | "object";
	referenceKey: string | null;
	parameters?: {
		[key: string]: {
			[key: string]: string | number | boolean;
		};
	};
};

export type BatchPostGameLabsActionOptions = {
	serverApiId?: string;
	actions: Omit<PostGameLabsActionOptions, "serverApiId">[];
};

//
// Start Included Actions
//

export type GameLabsActionTarget = ClientPlayerSession | string | AnyPlayerId;

export type IdentifierActionOptionsNoParams = {
	serverApiId?: string;
	identifier: string;
};

export type TargetActionOptionsNoParams = {
	serverApiId?: string;
	target: GameLabsActionTarget;
};

export type TeleportPlayerOptions = TargetActionOptionsNoParams & {
	position: [number, number, number];
};

export type SpawnItemOnPlayerOptions = TargetActionOptionsNoParams & {
	itemClassName: string;
	populateItem?: boolean;
	quantity?: number;
	stacked?: boolean;
};

export type ChangeWorldTimeOptions = {
	serverApiId?: string;
	hour: number;
	minute: number;
};

export type ChangeWorldWeatherOptions = {
	serverApiId?: string;
	fogDensity: number;
	overcast: number;
	rainIntensity: number;
	windIntensity: number;
};

export type SpawnItemOnGroundOptions = {
	serverApiId?: string;
	itemClassName: string;
	populateItem?: boolean;
	quantity?: number;
	stacked?: boolean;
	position: [number, number, number];
};

export type WrdgPushTransportOptions = IdentifierActionOptionsNoParams & {
	reverse?: boolean;
};

export type LBMutePlayerOptions = TargetActionOptionsNoParams & {
	durationInMinutes: number;
};
