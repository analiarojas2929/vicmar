import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import type { AddressQuery, AddressSuggestion } from "../lib/photon";
import { googleMapsEnabled, suggestGoogleAddresses } from "../lib/googleMaps";

const configuredDebounce = Number(import.meta.env.VITE_ADDRESS_DEBOUNCE_MS);
const debounce = Number.isFinite(configuredDebounce) && configuredDebounce >= 150 && configuredDebounce <= 1500
    ? configuredDebounce : 300;
const canSearchAddress = (street: string, number: string) =>
    street.trim().length > 0 && [street, number].filter(Boolean).join(" ").trim().length >= 3;

type SearchResult = {
    query: string;
    suggestions: AddressSuggestion[];
    failed: boolean;

};

export function useAddressSuggestions({ street, number, commune, region, address }: AddressQuery & { address: string }, enabled: boolean) {
    const [result, setResult] = useState<SearchResult | null>(null);
    const googleSession = useRef<{ token?: google.maps.places.AutocompleteSessionToken }>({});
    const query = JSON.stringify([address, commune, region]);

    useEffect(() => {
        if (!enabled || !canSearchAddress(street, number) || !googleMapsEnabled) return;
        const controller = new AbortController();
        const { signal } = controller;
        const searchAddresses = async () => {
            try {
                const suggestions = await suggestGoogleAddresses({ street, number, commune, region, address }, googleSession.current, signal);
                if (!signal.aborted) setResult({ query, suggestions, failed: false });
            } catch {
                if (!signal.aborted) setResult({ query, suggestions: [], failed: true });
            }
        };
        const timer = window.setTimeout(searchAddresses, debounce);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, address, street, number, commune, region, enabled]);

    if (!googleMapsEnabled) return { query, suggestions: [], failed: true };
    return result?.query === query ? result : null;
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
    const searching = enabled && canSearchAddress(street, number);
    const suggestions = searching && !dismissed ? result?.suggestions ?? [] : [];
    const expanded = suggestions.length > 0;
    const activeIndex = active?.query === result?.query ? suggestions.findIndex((item) => item.id === active?.id) : -1;
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
        {searching && !dismissed && !result && <p className="address-status small muted" role="status">
            <LoaderCircle className="spin" size={15} aria-hidden="true"/> Buscando en Google Maps…
        </p>}
        {searching && !dismissed && result && !expanded && <p className="address-status small muted" role="status">
            {result.failed ? "Google Places no está disponible por ahora. Puedes ubicar el punto manualmente."
                : "Dirección no encontrada. Puedes marcar el punto en el mapa."}
        </p>}
        {expanded && <ul id={id} className="address-suggestions" role="listbox" aria-label="Sugerencias de dirección">
        {suggestions.map((suggestion, index) => <li key={suggestion.id} id={optionId(index)} role="option"
            aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => pick(suggestion)}>
            <MapPin size={17} aria-hidden="true"/>
            <div><strong>{suggestion.address}</strong>
                <span>{[...new Set([suggestion.commune, suggestion.city, suggestion.region])].filter(Boolean).join(", ")}</span>
                <span className={suggestion.point ? "address-verified" : undefined}>{suggestion.resolve ? "Consultar ubicación" : suggestion.point ? "Dirección con número verificado"
                    : number ? `Calle encontrada · número ${number} sin punto verificado`
                    : "Referencia para ubicar el punto de retiro"}</span>
            </div>
        </li>)}
    </ul>}
    {suggestions.some((suggestion) => suggestion.resolve) && <p className="small muted" translate="no">Google Maps</p>}
    </div>;
}
