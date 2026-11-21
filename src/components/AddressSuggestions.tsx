import { useEffect, useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { LoaderCircle, MapPin, Search } from "lucide-react";
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
    pending?: boolean;
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
                setResult({ query, suggestions: primary.slice(0, 5), failed: false, pending: Boolean(number && !primary[0].point) });
                if (!number || primary[0].point) return;
            }
            const outcome = await searchAddress(context, signal, (suggestions) => {
                if (!signal.aborted && !primary.length) setResult({ query, suggestions, failed: false, pending: true });
            });
            if (signal.aborted) return;
            setResult(primary.length && !outcome.suggestions[0]?.point
                ? { query, suggestions: primary.slice(0, 5), failed: false }
                : { query, ...outcome });
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

export function AddressSuggestions({ street, number, result, onSelect, input, error, enabled }: Pick<AddressQuery, "street" | "number"> & {
    result: SearchResult | null;
    onSelect: (suggestion: AddressSuggestion) => void;
    input: ComponentPropsWithRef<"input">;
    error: ReactNode;
    enabled: boolean;
}) {
    const id = useId();
    const [dismissed, setDismissed] = useState(false);
    const [active, setActive] = useState<{ query: string; id: string }>();
    const searching = enabled && street.length >= 4;
    const suggestions = searching && !dismissed ? result?.suggestions ?? [] : [];
    const expanded = suggestions.length > 0;
    const activeIndex = active?.query === result?.query ? suggestions.findIndex((item) => item.id === active?.id) : -1;
    const sources = suggestions.flatMap(({ geoapifyAttribution }) =>
        geoapifyAttribution === undefined ? [] : [geoapifyAttribution]);
    const optionId = (index: number) => `${id}-option-${index}`;
    const pick = (suggestion: AddressSuggestion) => {
        setActive(undefined);
        setDismissed(true);
        onSelect(suggestion);
    };
    return <div className="address-field">
        <label className="field" htmlFor={input.id}>
            Dirección o referencia de retiro *
            <span className="address-input">
                <Search size={17} aria-hidden="true"/>
                <input {...input} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
                    aria-controls={expanded ? id : undefined}
                    aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
                    onFocus={() => setDismissed(false)}
                    onBlur={(event) => {
                        input.onBlur?.(event);
                        setActive(undefined);
                    }}
                    onChange={(event) => {
                        setDismissed(false);
                        setActive(undefined);
                        input.onChange?.(event);
                    }}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === "Tab") setDismissed(true);
                        if (event.key === "Escape" && expanded) {
                            event.preventDefault();
                            setActive(undefined);
                            setDismissed(true);
                        } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && result?.suggestions.length && searching) {
                            event.preventDefault();
                            const list = result.suggestions;
                            const index = event.key === "ArrowDown"
                                ? (activeIndex + 1) % list.length
                                : (activeIndex < 0 ? list.length - 1 : (activeIndex - 1 + list.length) % list.length);
                            setDismissed(false);
                            setActive({ query: result.query, id: list[index].id });
                            requestAnimationFrame(() => document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" }));
                        } else if (event.key === "Enter") {
                            event.preventDefault();
                            event.stopPropagation();
                            if (expanded && activeIndex >= 0) pick(suggestions[activeIndex]);
                        }
                    }}/>
            </span>
            {error}
        </label>
        {searching && !dismissed && (!result || result.pending) && <p className="address-status small muted" role="status">
            <LoaderCircle className="spin" size={15} aria-hidden="true"/> {result ? "Comprobando numeración…" : "Buscando direcciones…"}
        </p>}
        {searching && !dismissed && result && !result.pending && !expanded && <p className="address-status small muted" role="status">
            {result.failed ? "La búsqueda no está disponible por ahora. Puedes marcar el punto en el mapa."
                : "Dirección no encontrada. Puedes marcar el punto en el mapa."}
        </p>}
        {expanded && <ul id={id} className="address-suggestions" role="listbox" aria-label="Sugerencias de dirección">
        {suggestions.map((suggestion, index) => <li key={suggestion.id} id={optionId(index)} role="option"
            aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => pick(suggestion)}>
            <MapPin size={17} aria-hidden="true"/>
            <div><strong>{suggestion.address}</strong>
                <span>{[...new Set([suggestion.commune, suggestion.city, suggestion.region])].filter(Boolean).join(", ")}</span>
                <span className={suggestion.point ? "address-verified" : undefined}>{suggestion.point ? "Dirección con número verificado"
                    : number ? `Calle encontrada · número ${number} sin punto verificado`
                    : "Referencia de calle · marca el punto de retiro"}</span>
            </div>
        </li>)}
    </ul>}
    {sources.length > 0 && <GeoapifyAttribution sources={sources}/>}</div>;
}
