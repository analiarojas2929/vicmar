import { useEffect, useState } from "react";
import { searchAddress, type AddressQuery, type AddressSuggestion } from "../lib/photon";
import { searchGeoapify } from "../lib/geoapify";

const useGeoapify = import.meta.env.VITE_ADDRESS_PROVIDER === "geoapify";
const configuredDebounce = Number(import.meta.env.VITE_ADDRESS_DEBOUNCE_MS);
const debounce = Number.isFinite(configuredDebounce) && configuredDebounce >= 150 && configuredDebounce <= 1500
    ? configuredDebounce : 300;

type SearchResult = {
    query: string;
    suggestions: AddressSuggestion[];
    failed: boolean;
};

export function useAddressSuggestions({ street, number, commune, region }: AddressQuery, enabled: boolean) {
    const [result, setResult] = useState<SearchResult | null>(null);
    const query = JSON.stringify([street, number, commune, region]);

    useEffect(() => {
        if (!enabled || street.length < 4) return;
        const controller = new AbortController();
        const { signal } = controller;
        const searchAddresses = async () => {
            const context = { street, number, commune, region };
            const primary = useGeoapify ? await searchGeoapify(context, signal).catch(() => []) : [];
            if (signal.aborted) return;
            if (primary.length) {
                setResult({ query, suggestions: primary.slice(0, 5), failed: false });
                if (!number || primary[0].point) return;
            }
            const outcome = await searchAddress(context, signal);
            if (!signal.aborted && (!primary.length || outcome.suggestions[0]?.point)) {
                setResult({ query, ...outcome });
            }
        };
        const timer = window.setTimeout(searchAddresses, debounce);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, street, number, commune, region, enabled]);

    return result?.query === query ? result : null;
}

export function GeoapifyAttribution({ sources }: { sources: string[] }) {
    return <p className="small muted">
        Búsqueda por <a href="https://www.geoapify.com/">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
        {[...new Set(sources)].filter(Boolean).map((source) => <span key={source}> · {source}</span>)}
    </p>;
}

export function AddressSuggestions({ street, number, result, onSelect }: Pick<AddressQuery, "street" | "number"> & {
    result: SearchResult | null;
    onSelect: (suggestion: AddressSuggestion) => void;
}) {
    if (street.length < 4) return null;
    if (!result) return <p className="small muted" role="status">Buscando direcciones…</p>;
    if (!result.suggestions.length) return <p className="small muted" role="status">
        {result.failed ? "La búsqueda no está disponible por ahora. Puedes marcar el punto en el mapa."
            : "Dirección no encontrada. Puedes marcar el punto en el mapa."}
    </p>;

    const sources = result.suggestions.flatMap(({ geoapifyAttribution }) =>
        geoapifyAttribution === undefined ? [] : [geoapifyAttribution]);
    return <><ul className="address-suggestions" aria-label="Sugerencias de dirección">
        {result.suggestions.map((suggestion) => <li key={suggestion.id}>
            <button type="button" onClick={() => onSelect(suggestion)}>
                <strong>{suggestion.address}</strong>
                <span>{[...new Set([suggestion.commune, suggestion.city, suggestion.region])].filter(Boolean).join(", ")}</span>
                <span>{suggestion.point ? "Dirección con número verificado"
                    : number ? `Calle encontrada · número ${number} sin punto verificado`
                    : "Referencia de calle · marca el punto de retiro"}</span>
            </button>
        </li>)}
    </ul>
    {sources.length > 0 && <GeoapifyAttribution sources={sources}/>}</>;
}
