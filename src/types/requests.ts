import type { API_VERSION } from "../constants";

export abstract class AbstractRequestClient {
	public abstract apiUrl(
		version: API_VERSION,
		path: string,
		params?: URLSearchParams,
	): string;
	public abstract resolveHeaders(
		headersInit: HeadersInit,
		omitAuthHeaders?: boolean,
	): HeadersInit;
	public abstract resolveRequestOptions(
		url: string,
		options: RequestInit,
		omitAuthHeaders?: boolean,
	): RequestInit;
	public abstract request<T>(
		url: string,
		options: RequestInit,
		omitAuthHeaders?: boolean,
	): Promise<T>;

	public abstract get<T>(url: string, omitAuthHeaders?: boolean): Promise<T>;
	public abstract post<T>(
		url: string,
		body: Record<string, unknown>,
		omitAuthHeaders?: boolean,
	): Promise<T>;
	public abstract put<T>(
		url: string,
		body: Record<string, unknown>,
		omitAuthHeaders?: boolean,
	): Promise<T>;
	public abstract delete<T>(url: string, omitAuthHeaders?: boolean): Promise<T>;
}
