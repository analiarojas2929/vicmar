import { matchesHouseNumber, matchesStreet } from "./addressSearch";
import type { AddressQuery, AddressSuggestion } from "./photon";
import { territoryName } from "./territory";

const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY?.trim();
export const googleMapsEnabled = Boolean(key);
let loading: Promise<void> | undefined;
let authFailed = false;
const authListeners = new Set<() => void>();

export function onGoogleMapsAuthFailure(listener: () => void) {
    authListeners.add(listener);
    if (authFailed) listener();
    return () => { authListeners.delete(listener); };
}

export function loadGoogleMaps() {
    if (!key) return Promise.reject(new Error("Falta la clave de Google Maps"));
    if (!loading) {
        loading = new Promise<void>((resolve, reject) => {
            if (typeof window.google?.maps?.importLibrary === "function") {
                resolve();
                return;
            }
            const target = window as Window & { vicmarGoogleMapsReady?: () => void; gm_authFailure?: () => void };
            const script = document.createElement("script");
            target.gm_authFailure = () => {
                authFailed = true;
                for (const listener of authListeners) listener();
            };
            const fail = () => {
                window.clearTimeout(timer);
                delete target.vicmarGoogleMapsReady;
                script.remove();
                reject(new Error("Google Maps no disponible"));
            };
            const timer = window.setTimeout(fail, 12_000);
            target.vicmarGoogleMapsReady = () => {
                window.clearTimeout(timer);
                delete target.vicmarGoogleMapsReady;
                resolve();
            };
            const params = new URLSearchParams({ key: key ?? "", v: "weekly", loading: "async", language: "es", region: "CL",
                callback: "vicmarGoogleMapsReady" });
            script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
            script.async = true;
            script.onerror = fail;
            document.head.append(script);
        }).catch((error) => {
            loading = undefined;
            throw error;
        });
    }
    return loading;
}

export async function suggestGoogleAddresses(query: AddressQuery & { address: string }, session: { token?: google.maps.places.AutocompleteSessionToken }, signal: AbortSignal) {
    await loadGoogleMaps();
    if (authFailed) throw new Error("Google Maps no autorizó el acceso");
    const { AutocompleteSuggestion, AutocompleteSessionToken } =
        await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
    signal.throwIfAborted();
    const sessionToken = session.token ??= new AutocompleteSessionToken();
    const typedAddress = query.address.trim();
    const typedComponents = new Set(typedAddress.split(",").map(territoryName));
    const context = [...new Set([query.commune, query.region, "Chile"])]
        .filter((part) => part && !typedComponents.has(territoryName(part)));
    const input = [typedAddress, ...context].join(", ");
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input, sessionToken, includedRegionCodes: ["cl"], language: "es", region: "cl",
    });
    signal.throwIfAborted();
    return suggestions.flatMap(({ placePrediction }): AddressSuggestion[] => {
        if (!placePrediction) return [];
        const address = placePrediction.mainText?.text ?? placePrediction.text.text;
        const id = `google:${placePrediction.placeId}`;
        return [{
            id, address, street: query.street, point: null, center: null,
            city: placePrediction.secondaryText?.text,
            resolve: async () => {
                session.token = undefined;
                const place = placePrediction.toPlace();
                await place.fetchFields({ fields: ["addressComponents", "location"] });
                const components = place.addressComponents ?? [];
                const component = (type: string) => components.find((item) => item.types.includes(type));
                const street = component("route")?.longText;
                const number = component("street_number")?.longText;
                const city = component("locality")?.longText ?? component("postal_town")?.longText;
                const region = component("administrative_area_level_1")?.longText;
                const sameArea = (input: string, result?: string | null) =>
                    Boolean(result) && territoryName(input) === territoryName(result ?? "");
                const commune = [component("administrative_area_level_3")?.longText, city,
                    component("sublocality_level_1")?.longText, component("sublocality")?.longText]
                    .find((item) => sameArea(query.commune, item)) ?? undefined;
                if (component("country")?.shortText?.toUpperCase() !== "CL" || !place.location ||
                    (query.commune && !commune) || (query.region && !sameArea(query.region, region))) return null;
                const center: [number, number] = [place.location.lat(), place.location.lng()];
                const point = street && query.number && number && matchesStreet(query.street, street, true)
                    && matchesHouseNumber(query.number, number) ? center : null;
                return { id, street: street ?? "", address: street && point ? [street, number].join(" ") : address, city: city ?? undefined,
                    commune, region: region ?? undefined, center, point };
            },
        }];
    });
}
