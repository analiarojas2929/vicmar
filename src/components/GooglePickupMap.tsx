import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, onGoogleMapsAuthFailure } from "../lib/googleMaps";
import type { PickupMapProps, PickupPoint } from "./PickupMap";

const coordinates = ([lat, lng]: PickupPoint) => ({ lat, lng });

export function GooglePickupMap({ point, center, confirmed, onSelect, fallback }: PickupMapProps) {
    const container = useRef<HTMLDivElement>(null);
    const initial = useRef(point ?? center);
    const lastCenter = useRef(initial.current);
    const [map, setMap] = useState<google.maps.Map>();
    const [marker, setMarker] = useState<google.maps.Marker>();
    const [failed, setFailed] = useState(false);
    useEffect(() => onGoogleMapsAuthFailure(() => setFailed(true)), []);

    useEffect(() => {
        let disposed = false;
        const node = container.current;
        void (async () => {
            await loadGoogleMaps();
            const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
            const { Marker } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
            if (disposed || !node) return;
            const location = initial.current;
            const instance = new Map(node, {
                center: coordinates(location ?? [-33.45, -70.66]), zoom: location ? 16 : 5,
                gestureHandling: "cooperative", streetViewControl: false, mapTypeControl: false,
                fullscreenControl: true, clickableIcons: false,
            });
            setMap(instance);
            setMarker(new Marker({ title: "Punto de retiro" }));
        })().catch(() => { if (!disposed) setFailed(true); });
        return () => {
            disposed = true;
            node?.replaceChildren();
        };
    }, []);

    useEffect(() => {
        if (!map) return;
        if (center && center !== lastCenter.current) {
            map.panTo(coordinates(center));
            map.setZoom(16);
        }
        lastCenter.current = center ?? null;
    }, [map, center]);

    useEffect(() => {
        if (!map || !marker) return;
        marker.setMap(point ? map : null);
        marker.setDraggable(!confirmed);
        if (point) marker.setPosition(coordinates(point));
        return () => { marker.setMap(null); };
    }, [map, marker, point, confirmed]);

    useEffect(() => {
        if (!map || !marker || confirmed) return;
        const select = ({ latLng }: google.maps.MapMouseEvent) => {
            if (latLng) onSelect([latLng.lat(), latLng.lng()]);
        };
        const click = map.addListener("click", select);
        const drag = marker.addListener("dragend", select);
        return () => { click.remove(); drag.remove(); };
    }, [map, marker, confirmed, onSelect]);

    if (failed) return fallback;
    return <>
        {!confirmed && <p className="small muted">Toca el mapa para marcar la entrada o arrastra el marcador para ajustarla.</p>}
        <div className="pickup-map-frame" aria-busy={!map}>
            <div className="pickup-map-canvas" ref={container} role="region" aria-label="Mapa interactivo del punto de retiro"/>
            {!map && <span className="pickup-map-loading" role="status">Cargando mapa…</span>}
        </div>
        {!confirmed && map && <button type="button" className="text-link" onClick={() => {
            const position = map.getCenter();
            if (position) onSelect([position.lat(), position.lng()]);
        }}>Marcar el centro del mapa</button>}
    </>;
}
