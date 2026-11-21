import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, Link } from "react-router-dom";
import { Boxes, Droplets, ShieldCheck, Check, CheckCircle2, Printer, LoaderCircle, Info, LockKeyhole, MapPin, Pencil, } from "lucide-react";
import { services, disclaimer } from "../config/content";
import type { PickupPoint } from "../components/PickupMap";
import { PickupMapBoundary } from "../components/PickupMapBoundary";
import { PickupMapFallback } from "../components/PickupMapFallback";
import { AddressSuggestions, GeoapifyAttribution, useAddressSuggestions } from "../components/AddressSuggestions";
import { territoryName, useTerritoryCatalog } from "../lib/territory";
import { parseAddress } from "../lib/addressSearch";
import { reverseAddress, type AddressSuggestion } from "../lib/photon";
import { calculateEstimate, money, quoteSchema, type QuoteData, } from "../lib/quote";
import "./quote-location.css";
const loadPickupMap = () => import("../components/PickupMap");
const PickupMap = lazy(() => loadPickupMap().then(({ PickupMap }) => ({ default: PickupMap })));
const steps = ["Servicio", "Cantidad", "Ubicación", "Tus datos", "Resumen"];
const fields: FieldPath<QuoteData>[][] = [
    ["service", "waste"],
    ["quantity", "unit"],
    ["region", "commune", "address"],
    ["company", "name", "email", "phone", "consent"],
];

type LocationPrecision = "EXACTA" | "APROXIMADA" | "MANUAL" | "SIN_UBICACION";

type ConfirmedLocation = {
    address: string;
    normalizedAddress: string | null;
    street: string;
    number: string;
    commune: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    precision: "EXACTA" | "MANUAL";
    providerPrecision: Exclude<LocationPrecision, "MANUAL">;
    manuallyConfirmed: boolean;
    confirmed: true;
};

export default function Quote() {
    const regions = useTerritoryCatalog();
    const [params] = useSearchParams();
    const initial = services.find((s) => s.id === params.get("servicio"));
    const [step, setStep] = useState(0);
    const [request, setRequest] = useState<(QuoteData & { location: ConfirmedLocation }) | null>(null);
    const [busy, setBusy] = useState(false);
    const [showPickupMap, setShowPickupMap] = useState(false);
    const [searchAddress, setSearchAddress] = useState(false);
    const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);
    const [pickupConfirmed, setPickupConfirmed] = useState(false);
    const [pickupMapCenter, setPickupMapCenter] = useState<PickupPoint | null>(null);
    const [normalizedAddress, setNormalizedAddress] = useState<string | null>(null);
    const [pickupCity, setPickupCity] = useState("");
    const [pickupStreet, setPickupStreet] = useState("");
    const [pickupAttribution, setPickupAttribution] = useState<string>();
    const [manualPoint, setManualPoint] = useState(false);
    const providerPrecision = normalizedAddress ? "EXACTA" : pickupMapCenter ? "APROXIMADA" : "SIN_UBICACION";
    const pickupPrecision: LocationPrecision = pickupPoint
        ? manualPoint ? (pickupConfirmed ? "MANUAL" : "SIN_UBICACION") : "EXACTA"
        : pickupMapCenter ? "APROXIMADA" : "SIN_UBICACION";
    const [reverseResult, setReverseResult] = useState<{ point: PickupPoint; address: string | null } | null>(null);
    const [pickupError, setPickupError] = useState(false);
    const pickupCoordinates = pickupPoint
        ? `${pickupPoint[0].toFixed(6)}, ${pickupPoint[1].toFixed(6)}`
        : "";
    const heading = useRef<HTMLHeadingElement>(null);
    const { register, watch, setValue, trigger, handleSubmit, formState: { errors }, } = useForm<QuoteData>({
        resolver: zodResolver(quoteSchema),
        defaultValues: {
            service: initial?.id,
            unit: initial?.unit ?? "kg",
            waste: "",
            region: "",
            commune: "",
            address: "",
            company: "",
            name: "",
            email: "",
            phone: "",
            consent: false,
        },
        shouldUnregister: false,
    });
    const values = watch();
    const parsedAddress = parseAddress(values.address);
    const addressParts = parsedAddress.reference.split(",").map((part) => territoryName(part)).filter(Boolean);
    const typedRegion = regions.find((region) => addressParts.includes(territoryName(region.name)));
    const typedCommune = addressParts.length ? (typedRegion ? [typedRegion] : regions)
        .flatMap((region) => region.communes).find((commune) => addressParts.includes(territoryName(commune.name))) : undefined;
    const searchRegion = values.region || typedRegion?.name || "";
    const searchCommune = values.commune || typedCommune?.name || "";
    const conflictingTerritory = Boolean(
        (values.region && typedRegion && values.region !== typedRegion.name) ||
        (values.commune && typedCommune && values.commune !== typedCommune.name)
    );
    const addressResults = useAddressSuggestions(
        { street: parsedAddress.street, number: parsedAddress.number, commune: searchCommune, region: searchRegion },
        step === 2 && searchAddress && !conflictingTerritory
    );
    useEffect(() => {
        if (!pickupPoint || !manualPoint) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            const address = await reverseAddress(pickupPoint, controller.signal).catch(() => null);
            if (!controller.signal.aborted) setReverseResult({ point: pickupPoint, address });
        }, 450);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [pickupPoint, manualPoint]);

    const clearPickupLocation = () => {
        setPickupPoint(null);
        setPickupConfirmed(false);
        setPickupMapCenter(null);
        setNormalizedAddress(null);
        setPickupCity("");
        setPickupStreet("");
        setPickupAttribution(undefined);
        setManualPoint(false);
        setPickupError(false);
        setSearchAddress(true);
    };
    const selectManualPoint = useCallback((point: PickupPoint) => {
        setPickupPoint(point);
        setManualPoint(true);
        setPickupConfirmed(false);
    }, []);
    const communes = regions.find((region) => region.name === values.region)?.communes ?? [];
    const pickupAddress = [values.address, values.commune, values.region, "Chile"]
        .filter(Boolean).join(", ");
    const pickupMapFallback = useMemo(() => (
        <PickupMapFallback address={pickupAddress} coordinates={pickupCoordinates}
            confirmed={pickupConfirmed} onSelect={selectManualPoint}/>
    ), [pickupAddress, pickupCoordinates, pickupConfirmed, selectManualPoint]);
    const selected = services.find((s) => s.id === values.service);
    const estimate = calculateEstimate(values.service, values.quantity, values.unit);
    const move = (n: number) => {
        setStep(n);
        requestAnimationFrame(() => {
            heading.current?.focus({ preventScroll: true });
            heading.current?.scrollIntoView({ block: "nearest" });
        });
    };
    async function next() {
        if (!await trigger(fields[step], { shouldFocus: true })) return;
        if (step === 2 && (!pickupPoint || !pickupConfirmed || conflictingTerritory)) {
            setPickupError(true);
            setShowPickupMap(true);
            document.getElementById("pickup-map-title")?.focus();
            return;
        }
        move(step + 1);
    }
    function selectSuggestion(suggestion: AddressSuggestion) {
        const options = { shouldValidate: true, shouldDirty: true };
        const regionName = territoryName(suggestion.region ?? "");
        const communeName = territoryName(suggestion.commune ?? suggestion.city ?? "");
        const suggestedRegion = regions.find((region) => territoryName(region.name) === regionName);
        const region = suggestedRegion || regions.find((entry) => entry.name === values.region);
        const commune = region?.communes.find((entry) => territoryName(entry.name) === communeName);
        if (region) {
          if (!values.region) setValue("region", region.name, options);
          if (!values.commune && commune) setValue("commune", commune.name, options);
        }
        setPickupCity(suggestion.city ?? "");
        setPickupStreet(suggestion.street);
        setPickupAttribution(suggestion.geoapifyAttribution);
        setNormalizedAddress(suggestion.point
            ? [...new Set([suggestion.address, suggestion.commune, suggestion.city, suggestion.region])].filter(Boolean).join(", ")
            : null);
        setManualPoint(false);
        setPickupPoint(suggestion.point);
        setPickupConfirmed(false);
        setPickupMapCenter(suggestion.center);
        setShowPickupMap(true);
        setSearchAddress(false);
        requestAnimationFrame(() => {
            const title = document.getElementById("pickup-map-title");
            title?.focus({ preventScroll: true });
            title?.scrollIntoView({ block: "nearest" });
        });
    }
    async function previewPickup() {
        if (!await trigger(fields[2], { shouldFocus: true }) || conflictingTerritory) return;
        const best = addressResults?.suggestions[0];
        if (best) selectSuggestion(best);
        else setShowPickupMap(true);
    }
    async function submit(data: QuoteData) {
        if (step !== 4 || busy) return;
        if (!pickupPoint || !pickupConfirmed || conflictingTerritory) {
            setPickupError(true);
            move(2);
            return;
        }
        const location: ConfirmedLocation = {
            address: data.address,
            normalizedAddress,
            street: pickupStreet || parseAddress(data.address).street,
            number: parseAddress(data.address).number,
            commune: data.commune,
            city: pickupCity,
            region: data.region,
            latitude: pickupPoint[0],
            longitude: pickupPoint[1],
            precision: manualPoint ? "MANUAL" : "EXACTA",
            providerPrecision,
            manuallyConfirmed: manualPoint,
            confirmed: true,
        };
        setBusy(true);
        await new Promise((r) => setTimeout(r, 1000));
        setBusy(false);
        setRequest({ ...data, location });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const error = (key: FieldPath<QuoteData>) => errors[key] ? (<p className="field-error" id={`${key}-error`} role="alert">
        {errors[key]?.message}
      </p>) : null;
    const props = (key: FieldPath<QuoteData>) => ({
        "aria-invalid": !!errors[key],
        "aria-describedby": errors[key] ? `${key}-error` : undefined,
    });
    const summaryCoordinates = request
        ? [request.location.latitude, request.location.longitude].map((value) => value.toFixed(6)).join(", ")
        : pickupCoordinates;
    const summary = (<dl className="summary-list">
      <div>
        <dt>Servicio</dt>
        <dd>{selected?.title}</dd>
      </div>
      <div>
        <dt>Residuo</dt>
        <dd>{values.waste}</dd>
      </div>
      <div>
        <dt>Cantidad</dt>
        <dd>
          {values.quantity} {values.unit}
        </dd>
      </div>
      <div>
        <dt>Retiro solicitado</dt>
        <dd>
          {request ? [request.location.address, request.location.commune, request.location.region].filter(Boolean).join(", ") : pickupAddress}
          {(request?.location.normalizedAddress ?? normalizedAddress) && <><br />Dirección encontrada: {request?.location.normalizedAddress ?? normalizedAddress}</>}
          {summaryCoordinates && <><br />{(request?.location.precision ?? pickupPrecision) === "MANUAL"
              ? "Punto confirmado manualmente" : "Punto confirmado con coincidencia de calle y número"} · {summaryCoordinates}</>}
        </dd>
      </div>
      <div>
        <dt>Empresa y contacto</dt>
        <dd>
          {values.company} · {values.name}
          <br />
          {values.email}
          <br />
          {values.phone}
        </dd>
      </div>
    </dl>);
    const price = (<div className="estimate">
      <p className="eyebrow">ESTIMACIÓN DEMO · CLP</p>
      <strong>
        {estimate === null
            ? "Requiere evaluación personalizada"
            : money(estimate)}
      </strong>
      <p>{disclaimer}</p>
      <small>
        Tarifas ficticias. No constituye una oferta comercial ni confirma
        cobertura, impuestos, disponibilidad o condiciones del servicio.
      </small>
    </div>);
    if (request)
        return (<section className="section container confirmation">
        <div className="success-icon">
          <CheckCircle2 size={40}/>
        </div>
        <p className="eyebrow">SIMULACIÓN FINALIZADA</p>
        <h1>Tu solicitud demo está lista.</h1>
        <p role="status">
          Así se vería la confirmación. Tus datos no se han enviado a VICMAR ni
          se han guardado en un servidor.
        </p>
        <div className="print-sheet">
          <h2>Resumen de solicitud · DEMO</h2>
          {summary}
          {price}
          <p className="small muted">
            La aceptación y ejecución de un servicio requieren evaluación y
            confirmación directa de VICMAR.
          </p>
        </div>
        <div className="button-row no-print">
          <button className="button dark" onClick={() => window.print()}>
            <Printer size={18}/> Imprimir resumen
          </button>
          <button className="button outline" onClick={() => {
                setRequest(null);
                move(0);
            }}>
            Editar solicitud
          </button>
          <Link to="/" className="text-link">
            Volver al inicio
          </Link>
        </div>
      </section>);
    return (<>
      <section className="page-heading quote-heading">
        <div className="container">
          <p className="eyebrow">MENOS PASOS. MÁS CLARIDAD.</p>
          <h1>
            Tu próxima solución
            <br />
            empieza aquí.
          </h1>
          <p>
            Cuéntanos qué necesitas. Explora una estimación preliminar en cinco
            pasos.
          </p>
          <span className="demo-pill">
            Cotizador demostrativo · Sin envío real
          </span>
        </div>
      </section>
      <section className="container quote-layout">
        <div className="quote-main">
          <ol className="steps" aria-label="Progreso de cotización">
            {steps.map((s, i) => (<li key={s} className={i === step ? "current" : i < step ? "complete" : ""} aria-current={i === step ? "step" : undefined}>
                <span>{i < step ? <Check size={16}/> : i + 1}</span>
                <small>{s}</small>
              </li>))}
          </ol>
          <div className="progress-track" role="progressbar" aria-label="Progreso" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={5}>
            <span style={{ width: `${(step + 1) * 20}%` }}/>
          </div>
          <form onSubmit={handleSubmit(submit)} noValidate onKeyDown={(e) => {
            if (e.key === "Enter" &&
                (e.target as HTMLElement).tagName === "INPUT" &&
                step < 4) {
                e.preventDefault();
                void next();
            }
        }}>
            <div className="form-body">
              <p className="eyebrow">PASO {step + 1} DE 5</p>
              <h2 tabIndex={-1} ref={heading}>
                {[
            "¿Qué servicio necesitas?",
            "¿Qué cantidad necesitas retirar?",
            "¿Dónde sería el retiro?",
            "Conozcamos tu empresa.",
            "Todo listo para revisar.",
        ][step]}
              </h2>
              <p className="muted form-intro">
                {[
            "Selecciona una categoría y cuéntanos sobre tu residuo.",
            "Una cantidad aproximada es suficiente para esta simulación.",
            "La ubicación se recopila para evaluación; no confirma cobertura.",
            "Usa datos ficticios para recorrer esta demostración.",
            "Verifica los antecedentes antes de simular el envío.",
        ][step]}
              </p>
              {step === 0 && (<>
                  <fieldset>
                    <legend>
                      Tipo de servicio <span aria-hidden="true">*</span>
                    </legend>
                    <div className="service-options">
                      {services.map((s, i) => {
                const Icon = [Boxes, Droplets, ShieldCheck][i];
                return (<label key={s.id} className={`service-option ${values.service === s.id ? "selected" : ""}`}>
                            <input type="radio" value={s.id} {...register("service", {
                    onChange: (e) => {
                        setValue("unit", e.target.value === "liquidos" ? "L" : "kg");
                    },
                })} {...props("service")}/>
                            <Icon size={24}/>
                            <strong>{s.title}</strong>
                          </label>);
            })}
                    </div>
                    {error("service")}
                  </fieldset>
                  <label className="field" htmlFor="waste">
                    Describe el residuo *
                    <textarea id="waste" placeholder="Ej.: envases de un proceso industrial; indica material y condición." rows={4} maxLength={500} {...register("waste")} {...props("waste")}/>
                    {error("waste")}
                  </label>
                  <p className="inline-note">
                    <Info size={18}/> Categorías propuestas, sujetas a
                    validación técnica con VICMAR.
                  </p>
                </>)}
              {step === 1 && (<div className="field-grid">
                  <label className="field" htmlFor="quantity">
                    Cantidad aproximada *
                    <input id="quantity" type="number" inputMode="decimal" min="0.01" max="1000000" step="any" placeholder="Ej.: 500" {...register("quantity", { valueAsNumber: true })} {...props("quantity")}/>
                    {error("quantity")}
                  </label>
                  <label className="field" htmlFor="unit">
                    Unidad de medida *
                    <select id="unit" {...register("unit")} {...props("unit")}>
                      <option value={values.service === "liquidos" ? "L" : "kg"}>
                        {values.service === "liquidos"
                ? "Litros (L)"
                : "Kilogramos (kg)"}
                      </option>
                    </select>
                    {error("unit")}
                  </label>
                  <p className="inline-note full-width">
                    <Info size={18}/> La unidad depende del servicio. Para
                    otras unidades o volúmenes, se requiere evaluación
                    personalizada.
                  </p>
                </div>)}
              {step === 2 && (<>
                  <div className="field-grid">
                    <label className="field" htmlFor="region">
                      Región *
                      <select id="region" value={values.region} autoComplete="address-level1" {...register("region", {
                        onChange: () => {
                            setValue("commune", "");
                            clearPickupLocation();
                        },
                      })} {...props("region")}>
                        <option value="">Selecciona una región</option>
                        {regions.map((region) => <option key={region.code} value={region.name}>{region.name}</option>)}
                      </select>
                      {error("region")}
                    </label>
                    <label className="field" htmlFor="commune">
                      Comuna *
                      <select id="commune" value={values.commune} autoComplete="address-level2" disabled={!communes.length} {...register("commune", {
                        onChange: clearPickupLocation,
                      })} {...props("commune")}>
                        <option value="">{communes.length ? "Selecciona una comuna" : "Primero selecciona una región"}</option>
                        {communes.map((commune) => <option key={commune.code} value={commune.name}>{commune.name}</option>)}
                      </select>
                      {error("commune")}
                    </label>
                  </div>
                  <AddressSuggestions
                    enabled={searchAddress && !conflictingTerritory}
                    street={parsedAddress.street} number={parsedAddress.number} result={addressResults}
                    onSelect={selectSuggestion} error={error("address")}
                    input={{ id: "address", autoComplete: "off", placeholder: "Ej.: Av. Providencia 1200",
                        ...register("address", { onChange: clearPickupLocation }), ...props("address") }}/>
                  {conflictingTerritory && <p className="field-error" role="alert">La comuna o región escrita en la dirección no coincide con la selección. Corrígela antes de continuar.</p>}
                  <section className="pickup-map" aria-labelledby="pickup-map-title">
                    <h3 id="pickup-map-title" tabIndex={-1}><span className="pickup-map-icon"><MapPin size={18} aria-hidden="true"/></span> Mapa del punto de retiro</h3>
                    {pickupStreet && <div className="pickup-selected">
                        <strong>{normalizedAddress ?? pickupStreet}</strong>
                        <span>{providerPrecision === "EXACTA" ? "Dirección con número verificado" : "Referencia de calle"}</span>
                    </div>}
                    {pickupError && !pickupConfirmed && <p className="field-error" role="alert">Marca y confirma la ubicación para continuar.</p>}
                    {providerPrecision === "APROXIMADA" && parsedAddress.number && <p className="small muted" role="status">
                      Encontramos la calle, pero no pudimos verificar el número. Selecciona en el mapa la ubicación exacta de tu retiro.
                    </p>}
                    {showPickupMap ? <>
                      <PickupMapBoundary fallback={pickupMapFallback}>
                        <Suspense fallback={<div className="pickup-map-canvas pickup-map-placeholder" role="status">Cargando mapa…</div>}>
                          <PickupMap point={pickupPoint} center={pickupMapCenter} confirmed={pickupConfirmed} onSelect={selectManualPoint} fallback={pickupMapFallback}/>
                        </Suspense>
                      </PickupMapBoundary>
                      {pickupAttribution !== undefined && <GeoapifyAttribution sources={[pickupAttribution]}/>}
                      <div className="pickup-map-location" role="status">
                        {pickupPoint ? <>
                          <strong>{pickupConfirmed ? "Punto de retiro confirmado" : "Punto de retiro seleccionado"}</strong>
                          <span>{manualPoint ? "Punto elegido manualmente." : "Encontramos la calle y el número. Revisa la entrada."} · {pickupCoordinates}</span>
                          {manualPoint && reverseResult?.point === pickupPoint && <span>{reverseResult.address
                              ? `Referencia cercana en el mapa: ${reverseResult.address}`
                              : "No se encontró una dirección cercana verificable."}</span>}
                        </> : <span>{pickupMapCenter
                            ? "La sugerencia solo sirve como referencia. Marca la entrada del retiro en el mapa."
                            : "Marca la entrada del retiro en el mapa."}</span>}
                      </div>
                      {pickupPoint && <div className="pickup-map-actions">
                        <button type="button" className={`button ${pickupConfirmed ? "outline" : "dark"}`} onClick={() => {
                            setPickupConfirmed(!pickupConfirmed);
                            setPickupError(false);
                        }}>
                          {pickupConfirmed ? <><Pencil size={16}/> Editar punto de retiro</> : <><Check size={16}/> Confirmar punto de retiro</>}
                        </button>
                        {!pickupConfirmed && <button type="button" className="text-link" onClick={() => setPickupPoint(null)}>Quitar punto</button>}
                      </div>}
                      <a className="text-link" href={`https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: pickupCoordinates || pickupAddress })}`} target="_blank" rel="noopener noreferrer">
                        Abrir en Google Maps
                      </a>
                    </> : <button type="button" className="button outline" onClick={previewPickup}
                        onPointerEnter={(event) => { if (event.pointerType === "mouse") void loadPickupMap().catch(() => {}); }}>
                      Ubicar dirección en el mapa
                    </button>}
                  </section>
                </>)}
              {step === 3 && (<>
                  <div className="field-grid">
                    {([
                {
                    key: "company",
                    label: "Empresa",
                    type: "text",
                    auto: "organization",
                },
                {
                    key: "name",
                    label: "Nombre del solicitante",
                    type: "text",
                    auto: "name",
                },
                {
                    key: "email",
                    label: "Correo electrónico",
                    type: "email",
                    auto: "email",
                },
                {
                    key: "phone",
                    label: "Teléfono",
                    type: "tel",
                    auto: "tel",
                },
            ] as const).map((f) => (<label key={f.key} className="field" htmlFor={f.key}>
                        {f.label} *
                        <input id={f.key} type={f.type} autoComplete={f.auto} {...register(f.key)} {...props(f.key)}/>
                        {error(f.key)}
                      </label>))}
                  </div>
                  <label className="checkbox-label">
                    <input type="checkbox" {...register("consent")} {...props("consent")}/>
                    <span>
                      Entiendo que esta es una demostración y que mis datos no
                      se enviarán. Usaré información ficticia.
                    </span>
                  </label>
                  {error("consent")}
                </>)}
              {step === 4 && (<>
                  <div className="summary-header">
                    <h3>Detalle de tu solicitud</h3>
                    <button type="button" className="text-link" onClick={() => move(0)}>
                      <Pencil size={15}/> Editar
                    </button>
                  </div>
                  {summary}
                  {price}
                </>)}
              <p className="quote-disclaimer">
                <Info size={16}/>
                {disclaimer}
              </p>
            </div>
            <div className="form-actions">
              {step > 0 ? (<button className="button outline" type="button" disabled={busy} onClick={() => move(step - 1)}>
                  Anterior
                </button>) : (<span className="small muted">* Campos obligatorios</span>)}
              {step < 4 ? (<button key="next" className="button dark" type="button" onClick={() => void next()}>
                  Continuar
                </button>) : (<button key="submit" className="button dark" type="submit" disabled={busy}>
                  {busy ? (<>
                      <LoaderCircle className="spin" size={18}/> Simulando…
                    </>) : ("Simular envío de solicitud")}
                </button>)}
            </div>
          </form>
        </div>
        <aside className="quote-aside">
          <span className="icon-box">
            <ShieldCheck size={28}/>
          </span>
          <h3>
            Una solicitud clara.
            <br />
            Una mejor evaluación.
          </h3>
          <p>
            Ten a mano el tipo de residuo, una cantidad aproximada y la
            ubicación de tu operación.
          </p>
          <ul>
            <li>
              <Check size={16}/> Sin compromiso comercial
            </li>
            <li>
              <Check size={16}/> Resumen imprimible
            </li>
            <li>
              <Check size={16}/> Datos solo en esta sesión
            </li>
          </ul>
          <div className="aside-note">
            <Info size={20}/>
            <p>{disclaimer}</p>
          </div>
          <p className="small">
            <LockKeyhole size={14}/> No se realizan pagos ni se envían datos.
          </p>
        </aside>
      </section>
    </>);
}
