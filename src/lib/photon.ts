import { matchesHouseNumber, matchesStreet } from "./addressSearch";
import { territoryName } from "./territory";
import type { PickupPoint } from "../components/PickupMap";

export type PhotonFeature = {
    properties: {
        osm_type?: string;
        osm_id?: number;
        osm_key?: string;
        osm_value?: string;
        type?: string;
        name?: string;
        street?: string;
        housenumber?: string;
        city?: string;
        district?: string;
        locality?: string;
        county?: string;
        state?: string;
        countrycode?: string;
    };
    geometry: { coordinates: [number, number] };
};

export type AddressSuggestion = {
    id: string;
    address: string;
    street: string;
    commune?: string;
    city?: string;
    region?: string;
    geoapifyAttribution?: string;
    point: PickupPoint | null;
    center: PickupPoint;
};

export type AddressQuery = { street: string; number: string; commune: string; region: string };

export function sameSuggestion(a: AddressSuggestion, b: AddressSuggestion) {
    if (a.id === b.id) return true;
    return !a.point && !b.point && matchesStreet(a.address, b.address, true) &&
        (["commune", "city", "region"] as const).every((key) =>
            territoryName(a[key] ?? "") === territoryName(b[key] ?? ""));
}

const featureCache = new Map<string, { expires: number; features: PhotonFeature[] }>();
let retryAfter = 0;

export async function fetchFeatures(endpoint: string, params: URLSearchParams, signal: AbortSignal) {
    signal.throwIfAborted();
    const key = `${endpoint}?${params}`;
    const cached = featureCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.features;
    if (Date.now() < retryAfter) throw new Error("Photon está limitando las consultas");
    const response = await fetch(`https://photon.komoot.io/${key}`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5500)]),
    });
    if (response.status === 429) retryAfter = Date.now() + 30_000;
    if (!response.ok) throw new Error("Error de geocodificación");
    const { features } = await response.json() as { features: PhotonFeature[] };
    if (!Array.isArray(features)) throw new Error("Respuesta de geocodificación inválida");
    signal.throwIfAborted();
    if (featureCache.size >= 64) featureCache.delete(featureCache.keys().next().value!);
    featureCache.set(key, { expires: Date.now() + 5 * 60_000, features });
    return features;
}

export function describeFeature({ properties: p }: PhotonFeature) {
    const street = p.street || (p.type === "street" ? p.name : undefined);
    return {
        street,
        address: street ? [street, p.housenumber].filter(Boolean).join(" ") : undefined,
    };
}

export function toSuggestion(feature: PhotonFeature, query: AddressQuery): AddressSuggestion | null {
    const p = feature.properties;
    const { street, address } = describeFeature(feature);
    const [lng, lat] = feature.geometry.coordinates;
    if (p.countrycode?.toUpperCase() !== "CL" || !street || !address ||
        !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
        !matchesStreet(query.street, street, Boolean(query.number))) return null;
    const same = (expected: string, actual?: string) =>
        Boolean(actual) && territoryName(expected) === territoryName(actual ?? "");
    const commune = query.commune
        ? [p.city, p.district, p.locality, p.county].find((entry) => same(query.commune, entry))
        : undefined;
    if ((query.commune && !commune) || (query.region && !same(query.region, p.state))) return null;
    const center: PickupPoint = [lat, lng];
    const matchingNumber = Boolean(query.number && p.housenumber && matchesHouseNumber(query.number, p.housenumber));
    const interpolation = p.osm_type === "I" || p.osm_key === "addr:interpolation" || p.osm_value === "interpolation";
    const point = p.type === "house" && matchingNumber && !interpolation ? center : null;
    // A house with some other number is neither a match nor a street reference.
    if (!point && p.type !== "street" && !matchingNumber) return null;
    return {
        id: JSON.stringify([p.osm_type, p.osm_id, address, center]),
        address,
        street,
        commune,
        city: p.city,
        region: p.state,
        point,
        center,
    };
}

export async function searchAddress(query: AddressQuery, signal: AbortSignal) {
    const { street, number, commune, region } = query;
    const common = { countrycode: "CL", limit: "12" };
    const area = [...new Set([commune, region])].filter(Boolean);
    const suggestions: AddressSuggestion[] = [];
    let failed = false;
    let successful = false;

    const structured = (name: string, houseOnly = false) => {
        const params = new URLSearchParams({ ...common, street: name });
        if (number) params.set("housenumber", number);
        else params.set("layer", "street");
        if (houseOnly) params.set("layer", "house");
        if (commune) params.set("city", commune);
        if (region) params.set("state", region);
        return params;
    };
    const freeText = (name: string, layer: "house" | "street") =>
        new URLSearchParams({ ...common, q: [name, ...area].join(", "), layer });
    async function search(endpoint: string, params: URLSearchParams) {
        try {
            const features = await fetchFeatures(endpoint, params, signal);
            successful = true;
            return features.flatMap((feature) => {
                const suggestion = toSuggestion(feature, query);
                return suggestion ? [suggestion] : [];
            });
        } catch {
            failed = true;
            return [];
        }
    }
    const add = (results: AddressSuggestion[]) => {
        for (const candidate of results) {
            if (!suggestions.some((item) => sameSuggestion(item, candidate))) suggestions.push(candidate);
        }
    };
    const hasHouse = () => suggestions.some(({ point }) => point);
    add(await search("structured", structured(street)));
    if (!hasHouse() && !signal.aborted) {
        const houseResults = number ? search("api", freeText(`${street} ${number}`, "house")) : Promise.resolve([]);
        const streetResults = suggestions.length ? [] : await search("api", freeText(street, "street"));
        const variants = [...new Set([...suggestions, ...streetResults].map((item) => item.street))]
            .filter((name) => name.toLowerCase() !== street.toLowerCase()).slice(0, 2);
        add(streetResults);
        if (number && !signal.aborted) {
            const results = await Promise.all([
                houseResults,
                ...variants.map((name) => search("structured", structured(name, true))),
            ]);
            results.forEach(add);
        }
    }
    const best = hasHouse() ? suggestions.filter(({ point }) => point) : suggestions;
    return { suggestions: best.slice(0, 5), failed: failed && !successful };
}

export async function reverseAddress([lat, lon]: PickupPoint, signal: AbortSignal) {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: "0.15", limit: "3" });
    const features = await fetchFeatures("reverse", params, signal);
    const feature = features.find((entry) =>
        entry.properties.countrycode?.toUpperCase() === "CL" && describeFeature(entry).address);
    if (!feature) return null;
    return [describeFeature(feature).address, feature.properties.city, feature.properties.state].filter(Boolean).join(", ");
}
