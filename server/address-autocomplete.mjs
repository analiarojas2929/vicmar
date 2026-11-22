const headers = { "Cache-Control": "no-store" };

export async function lookupAddress(request, key) {
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    if (!key) return new Response(null, { status: 503, headers });

    const query = await request.json().catch(() => null);
    if (!query || [["street", 200], ["number", 20], ["commune", 100], ["region", 100]].some(([field, max]) =>
        typeof query[field] !== "string" || query[field].length > max) || !query.street.trim() ||
        [query.street, query.number].filter(Boolean).join(" ").trim().length < 3) {
        return new Response(null, { status: 400, headers });
    }

    const address = [query.street, query.number].filter(Boolean).join(" ");
    const text = [...new Set([address, query.commune, query.region, "Chile"])].filter(Boolean).join(", ");
    const params = new URLSearchParams({ text, lang: "es", filter: "countrycode:cl", limit: "7", format: "json", apiKey: key });
    try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, {
            signal: AbortSignal.any([request.signal, AbortSignal.timeout(3500)]),
        });
        if (response.status === 429) {
            return new Response(null, { status: 429, headers: { ...headers, "Retry-After": response.headers.get("Retry-After") || "30" } });
        }
        if (!response.ok) return new Response(null, { status: 502, headers });
        const { results } = await response.json();
        if (!Array.isArray(results)) return new Response(null, { status: 502, headers });
        return Response.json({ results: results.map((entry) => ({
            place_id: entry.place_id, name: entry.name, street: entry.street, housenumber: entry.housenumber,
            city: entry.city, county: entry.county, municipality: entry.municipality,
            district: entry.district, suburb: entry.suburb, state: entry.state, country_code: entry.country_code,
            lat: entry.lat, lon: entry.lon, result_type: entry.result_type,
            match_type: entry.rank?.match_type, building_confidence: entry.rank?.confidence_building_level,
            attribution: entry.datasource?.attribution,
        })) }, { headers });
    } catch {
        return new Response(null, { status: 502, headers });
    }
}
