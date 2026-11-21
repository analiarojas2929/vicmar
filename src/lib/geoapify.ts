import { sameSuggestion, toSuggestion, type AddressQuery, type AddressSuggestion } from "./photon";

export type GeoapifyResult = {
    place_id?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    municipality?: string;
    district?: string;
    suburb?: string;
    state?: string;
    country_code?: string;
    lat: number;
    lon: number;
    result_type?: string;
    match_type?: string;
    building_confidence?: number;
    attribution?: string;
};

export function geoapifySuggestion(entry: GeoapifyResult, query: AddressQuery): AddressSuggestion | null {
    const building = entry.result_type === "building";
    const verified = building && (entry.building_confidence ?? 0) >= 0.95 &&
        ["full_match", "match_by_building"].includes(entry.match_type ?? "");
    if (!building && entry.result_type !== "street") return null;
    const district = [entry.municipality, entry.district, entry.suburb];
    for (const name of new Set(district)) {
        const suggestion = toSuggestion({
            properties: {
                type: verified ? "house" : building ? "building" : "street",
                street: entry.street, housenumber: entry.housenumber,
                city: entry.city, county: entry.county, district: name, state: entry.state,
                countrycode: entry.country_code,
            },
            geometry: { coordinates: [entry.lon, entry.lat] },
        }, query);
        if (suggestion) return {
            ...suggestion,
            id: `geoapify:${entry.place_id || suggestion.id}`,
            geoapifyAttribution: typeof entry.attribution === "string" ? entry.attribution : "",
        };
    }
    return null;
}

let retryAfter = 0;

export async function searchGeoapify(query: AddressQuery, signal: AbortSignal) {
    if (Date.now() < retryAfter) return [];
    const response = await fetch("/api/address-autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]),
    });
    if (response.status === 429) {
        const value = response.headers.get("Retry-After");
        const seconds = value && /^\d+$/.test(value) ? Number(value) : 30;
        retryAfter = Date.now() + Math.max(1, Math.min(seconds, 300)) * 1000;
    }
    if (!response.ok) return [];
    const { results } = await response.json() as { results?: GeoapifyResult[] };
    if (!Array.isArray(results)) return [];
    const suggestions: AddressSuggestion[] = [];
    for (const entry of results) {
        const suggestion = geoapifySuggestion(entry, query);
        if (suggestion && !suggestions.some((item) => sameSuggestion(item, suggestion))) suggestions.push(suggestion);
    }
    return suggestions.sort((a, b) => Number(Boolean(b.point)) - Number(Boolean(a.point)));
}
