import { useState } from "react";
import type { PickupPoint } from "./PickupMap";

export function PickupMapFallback({ address, coordinates, confirmed, onSelect }: {
    address: string;
    coordinates: string;
    confirmed: boolean;
    onSelect: (point: PickupPoint) => void;
}) {
    const [input, setInput] = useState("");
    const [invalid, setInvalid] = useState(false);
    return <>
        <iframe className="pickup-map-canvas" title="Vista de referencia en Google Maps"
            src={`https://maps.google.com/maps?${new URLSearchParams({ q: coordinates || address, output: "embed", hl: "es" })}`}
            referrerPolicy="no-referrer" allowFullScreen/>
        {!confirmed && <>
            <p className="small muted">Si el mapa interactivo no carga, abre Google Maps, marca la entrada y copia sus coordenadas aquí.</p>
            <label className="field" htmlFor="pickup-coordinates">
                Latitud y longitud
                <input id="pickup-coordinates" value={input} onChange={(event) => {
                    setInput(event.target.value);
                    setInvalid(false);
                }} onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }} placeholder="Latitud, longitud" aria-invalid={invalid}/>
            </label>
            {invalid && <p className="field-error" role="alert">Ingresa dos coordenadas decimales separadas por una coma.</p>}
            <button type="button" className="button outline" onClick={() => {
                const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
                const latitude = Number(match?.[1]);
                const longitude = Number(match?.[2]);
                if (!match || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                    setInvalid(true);
                    return;
                }
                onSelect([latitude, longitude]);
            }}>Usar coordenadas</button>
        </>}
    </>;
}
