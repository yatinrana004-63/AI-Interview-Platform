import { useAuth } from "@clerk/react";
import { useCallback } from "react";

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async (url, { body, method = "GET", signal } = {}) => {
    const token = await getToken();
    const response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return undefined;
    const data = await response.json().catch(() => null);
    if (!response.ok || data === null) {
      throw new Error(data?.message || "The server could not complete the request. Try again.");
    }
    return data;
  }, [getToken]);
}
