import { useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, Link } from "react-router-dom";
import { Boxes, Droplets, ShieldCheck, Check, CheckCircle2, Printer, LoaderCircle, Info, LockKeyhole, Pencil, } from "lucide-react";
import { services, disclaimer } from "../config/content";
import { calculateEstimate, money, quoteSchema, type QuoteData, } from "../lib/quote";
const steps = ["Servicio", "Cantidad", "Ubicación", "Tus datos", "Resumen"];
const fields: FieldPath<QuoteData>[][] = [
    ["service", "waste"],
    ["quantity", "unit"],
    ["region", "commune", "address"],
    ["company", "name", "email", "phone", "consent"],
];
export default function Quote() {
    const [params] = useSearchParams();
    const initial = services.find((s) => s.id === params.get("servicio"));
    const [step, setStep] = useState(0);
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
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
    const selected = services.find((s) => s.id === values.service);
    const estimate = calculateEstimate(values.service, values.quantity, values.unit);
    const move = (n: number) => {
        setStep(n);
        requestAnimationFrame(() => {
            heading.current?.focus();
            heading.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
    };
    async function next() {
        if (await trigger(fields[step], { shouldFocus: true }))
            move(step + 1);
    }
    async function submit() {
        setBusy(true);
        await new Promise((r) => setTimeout(r, 1000));
        setBusy(false);
        setSent(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const error = (key: FieldPath<QuoteData>) => errors[key] ? (<p className="field-error" id={`${key}-error`} role="alert">
        {errors[key]?.message}
      </p>) : null;
    const props = (key: FieldPath<QuoteData>) => ({
        "aria-invalid": !!errors[key],
        "aria-describedby": errors[key] ? `${key}-error` : undefined,
    });
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
          {values.address}, {values.commune}, {values.region}
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
    if (sent)
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
                setSent(false);
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
                      <input id="region" autoComplete="address-level1" placeholder="Región del retiro" {...register("region")} {...props("region")}/>
                      {error("region")}
                    </label>
                    <label className="field" htmlFor="commune">
                      Comuna *
                      <input id="commune" autoComplete="address-level2" placeholder="Comuna del retiro" {...register("commune")} {...props("commune")}/>
                      {error("commune")}
                    </label>
                  </div>
                  <label className="field" htmlFor="address">
                    Dirección o referencia de retiro *
                    <input id="address" autoComplete="street-address" placeholder="Calle, número y referencia de acceso" {...register("address")} {...props("address")}/>
                    {error("address")}
                  </label>
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
