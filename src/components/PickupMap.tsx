import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { FullscreenControl, Map, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

export type PickupPoint = [latitude: number, longitude: number];

function mapCoordinates([latitude, longitude]: PickupPoint): [number, number] {
    return [longitude, latitude];
}

export type PickupMapProps = {
    point: PickupPoint | null;
    center?: PickupPoint | null;
    confirmed: boolean;
    onSelect: (point: PickupPoint) => void;
    fallback: ReactNode;
};

export const PickupMap = memo(function PickupMap({ point, center, confirmed, onSelect, fallback }: PickupMapProps) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const pin = useRef<Marker | null>(null);
    const onSelectRef = useRef(onSelect);
    const initialPoint = useRef(point ?? center);
    const lastCenter = useRef(initialPoint.current);
    const [loading, setLoading] = useState(true);
    const [mapUnavailable, setMapUnavailable] = useState(false);

    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

    useEffect(() => {
        if (!container.current) return;

        const savedPoint = initialPoint.current;
        let instance: Map;
        try {
            instance = new Map({
                container: container.current,
                style: "https://tiles.openfreemap.org/styles/liberty",
                center: mapCoordinates(savedPoint ?? [-33.45, -70.66]),
                zoom: savedPoint ? 16 : 5,
                maxZoom: 19,
                scrollZoom: false,
                dragRotate: false,
                touchPitch: false,
                cooperativeGestures: true,
                pixelRatio: Math.min(window.devicePixelRatio || 1, 1.75),
                locale: {
                    "NavigationControl.ZoomIn": "Acercar",
                    "NavigationControl.ZoomOut": "Alejar",
                    "FullscreenControl.Enter": "Pantalla completa",
                    "FullscreenControl.Exit": "Salir de pantalla completa",
                    "AttributionControl.ToggleAttribution": "Créditos del mapa",
                },
            });
        } catch {
            setMapUnavailable(true);
            return;
        }
        mapRef.current = instance;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
        instance.addControl(new FullscreenControl(), "top-right");
        const timeout = window.setTimeout(() => {
            if (!instance.getStyle()?.layers?.length) setMapUnavailable(true);
            else setLoading(false);
        }, 12_000);
        instance.once("load", () => {
            window.clearTimeout(timeout);
            setLoading(false);
        });

        return () => {
            window.clearTimeout(timeout);
            pin.current?.remove();
            instance.remove();
            mapRef.current = null;
            pin.current = null;
        };
    }, [mapUnavailable]);

    useEffect(() => {
        if (!center) {
            lastCenter.current = null;
            return;
        }
        if (lastCenter.current?.[0] === center[0] && lastCenter.current[1] === center[1]) return;
        lastCenter.current = center;
        mapRef.current?.easeTo({ center: mapCoordinates(center), zoom: 16, duration: 350 });
    }, [center]);

    useEffect(() => {
        const instance = mapRef.current;
        if (!instance || confirmed) return;
        const select = ({ lngLat }: MapMouseEvent) => {
            const { lat, lng } = lngLat.wrap();
            onSelect([lat, lng]);
        };
        instance.on("click", select);
        return () => { instance.off("click", select); };
    }, [confirmed, onSelect]);

    useEffect(() => {
        const instance = mapRef.current;
        if (!instance) return;
        if (!point) {
            pin.current?.remove();
            pin.current = null;
            return;
        }
        if (!pin.current) {
            const element = document.createElement("div");
            element.className = "pickup-pin";
            element.setAttribute("aria-hidden", "true");
            const marker = new Marker({ element, anchor: "bottom" })
                .setLngLat(mapCoordinates(point)).addTo(instance);
            marker.on("dragend", () => {
                const { lat, lng } = marker.getLngLat().wrap();
                onSelectRef.current([lat, lng]);
            });
            pin.current = marker;
        }
        pin.current.setDraggable(!confirmed);
        pin.current.getElement().classList.toggle("is-confirmed", confirmed);
        pin.current.setLngLat(mapCoordinates(point));
    }, [point, confirmed]);

    if (mapUnavailable) return fallback;

    return <>
        {!confirmed && <p className="small muted">Toca o haz clic en el mapa para marcar la entrada. Puedes arrastrar el marcador para ajustarlo.</p>}
        <div className="pickup-map-frame" aria-busy={loading}>
            <div className={`pickup-map-canvas${confirmed ? "" : " is-editable"}`} ref={container} role="region" aria-label="Mapa interactivo del punto de retiro"/>
            {loading && <span className="pickup-map-loading" role="status">Cargando mapa…</span>}
        </div>
        {!confirmed && <button type="button" className="text-link" onClick={() => {
            const position = mapRef.current?.getCenter().wrap();
            if (position) onSelect([position.lat, position.lng]);
        }}>
            Marcar el centro del mapa
        </button>}
    </>;
});
