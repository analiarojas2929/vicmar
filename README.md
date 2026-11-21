# VICMAR · Prototipo comercial por A&D DIGITAL

Propuesta de A&D DIGITAL (Analia Rojas y Damaris Tapia). Aplicación React + Vite + TypeScript, Tailwind CSS 4, React Router, Lucide, Framer Motion, React Hook Form y Zod. **No es una aplicación en producción ni el sitio oficial de VICMAR.**

## Ejecutar

Requiere Node.js 22.12+ (o 20.19+) y npm.

```sh
npm install
npm run dev
```

Abrir la URL que Vite muestre (habitualmente http://localhost:5173).

```sh
npm run build    # TypeScript y compilación en dist/
npm run preview  # Revisar compilación
npm test         # Pruebas del cálculo y validaciones
```

## Arquitectura

```text
src/
  components/      # Layout, navegación, footer, tarjetas, CTA, animación
  pages/           # Inicio, Nosotros, Servicios, Contacto, Demo y Cotizador
  config/
    content.ts     # Datos editables, servicios, contacto y textos
    demoRates.ts   # Tarifas ficticias configurables
  lib/
    quote.ts       # Esquema Zod, cálculo puro y formato monetario
    quote.test.ts  # Casos de cálculo y límites
  main.tsx         # Rutas con carga diferida
  styles.css       # Tokens, diseño adaptable, accesibilidad e impresión
public/            # Imágenes locales, Open Graph y robots
netlify.toml       # Compilación, SPA fallback y headers
```

Rutas: `/`, `/nosotros`, `/servicios`, `/cotizador`, `/contacto`, `/demo`. Servicios enlazan al cotizador con `?servicio=solidos|liquidos|especiales`. Las rutas desconocidas muestran una página de ayuda.

## Recorrido para presentación

1. Explorar Inicio y Servicios en escritorio y móvil.
2. Elegir sólidos, describir el residuo, ingresar 500 kg, ubicación y contacto ficticios.
3. Aceptar la declaración demo. Revisar la estimación ficticia de $95.000 CLP.
4. Simular envío; imprimir el resumen o volver a editar.
5. Repetir con residuos especiales: se muestra «Requiere evaluación personalizada».
6. Probar campos vacíos, correo inválido y cantidad cero para mostrar validación.
7. Revisar `/demo` para explicar el alcance y los próximos pasos.

Los formularios no envían información a VICMAR. Solo simulan espera y éxito. No existe backend, CRM, envío de correo, pago ni almacenamiento persistente. La información vive en memoria del componente; recargar o salir de la página la descarta. No se incluye información del usuario en URLs, logs o solicitudes externas.

## Contenido y tarifas

Editar `src/config/content.ts`: WhatsApp debe ser un número verificado con código de país; correo y dirección se dejan vacíos hasta su validación. Cuando se configuran, se habilitan enlaces `wa.me` y `mailto`. Sin configuración, el botón explica el estado sin inventar contactos. Los enlaces externos son la única salida del prototipo.

Editar `src/config/demoRates.ts`: tarifas exclusivamente ficticias en CLP, base + cantidad × tarifa por unidad. Sólidos usan kg, líquidos L, especiales kg y evaluación sin tarifa. El cálculo no considera ubicación, impuestos, peligrosidad, logística ni disponibilidad. No convertir estas cifras en una oferta comercial. Mantener el aviso «Valor demostrativo, sujeto a evaluación y confirmación por VICMAR».

Los textos de presentación, misión y valores son propuestas para aprobación. No hay afirmaciones de antigüedad, certificaciones, clientes ni cobertura. La ubicación solicitada no implica disponibilidad geográfica. Las tarjetas sociales son conceptos demo, no publicaciones reales.

## Referencias y recursos

Se pudo recuperar el HTML público de https://vicmar.cl/ el 18 de noviembre de 2026 mediante HTTP; el acceso inicial del navegador de consulta falló. Se revisaron el logo y recursos públicos, sin hacer una auditoría técnica ni confirmar vigencia de autorizaciones. Instagram no pudo consultarse; se utiliza únicamente el perfil entregado por el cliente.

- Logotipo: https://vicmar.cl/wp-content/uploads/2020/02/LOGO-1024x1001.png
- Imagen ambiental: https://vicmar.cl/wp-content/uploads/2017/11/tamara03.jpg
- Foto industrial ilustrativa: https://images.unsplash.com/photo-1494412519320-aa613dfb7738 (Unsplash). No representa a VICMAR ni su flota.
- Inter: paquete @fontsource/inter, servido localmente.

Confirmar derechos de uso de los recursos de marca antes de una publicación oficial. Paleta interpretada del logotipo público (verde y lima); verde profundo propuesto para la interfaz. Imágenes locales optimizadas en WebP y dimensiones declaradas; foto ambiental con carga diferida.

## Netlify

### Autocompletado de direcciones

- Photon funciona por defecto en producción y también actúa como respaldo del buscador Geoapify.
- Para habilitar Geoapify, configura `GEOAPIFY_API_KEY` con alcance **Functions** en Netlify. Configura `VITE_ADDRESS_PROVIDER=geoapify` para el proceso que compila el frontend. La clave se usa únicamente en la función `/api/address-autocomplete`.
- `VITE_ADDRESS_DEBOUNCE_MS` ajusta la espera entre pulsaciones. El valor predeterminado es 300 ms y el intervalo aceptado es de 150 a 1500 ms.
- En desarrollo, `npm run dev` activa Geoapify automáticamente cuando `GEOAPIFY_API_KEY` está definida en `.env.development.local`. La clave queda en el servidor local. Usa `VITE_ADDRESS_PROVIDER=photon` si necesitas probar solo Photon. Para un despliegue manual con `--no-build`, define la variable pública antes de `npm run build` y despliega desde la raíz del repositorio para que Netlify incluya la función.
- Geoapify utiliza una llamada por solicitud de autocompletado. El endpoint limita solicitudes por IP, evita persistir respuestas y mantiene visible la atribución. El cotizador sigue siendo una demo.

Publicado el 19 de noviembre de 2026 en https://vicmar-demo-ad-digital.netlify.app, dentro del equipo A&D DIGITAL de Netlify. El acceso solicita iniciar sesión en Netlify según la protección vigente del sitio. Se conservó esa protección. Panel: https://app.netlify.com/projects/vicmar-demo-ad-digital.

`netlify.toml` configura `npm run build`, carpeta `dist`, fallback SPA para acceso directo a rutas y headers básicos. No requiere variables de entorno ni secretos de aplicación. El directorio está vinculado al sitio mediante `.netlify/state.json` (excluido de Git). Para actualizar después de cambios:

```sh
npm run build
npx netlify-cli deploy --prod --dir dist --no-build
```

La primera vez en otro equipo: `npx netlify-cli login` y `npx netlify-cli link --id 55cb5eff-59ab-40be-85fb-c496649e34d5`. Las credenciales se gestionan en Netlify CLI; no se guardan en el repositorio. No se ha conectado un repositorio para despliegue automático. También se preparó `artifacts/vicmar-netlify.zip` como copia del sitio compilado.

El prototipo incluye `noindex,nofollow` y robots que bloquea indexación. Para una versión oficial: aprobar textos/contactos, reemplazar tarifas demo, definir dominio, añadir URL absoluta canónica y Open Graph, revisar privacidad y retirar el bloqueo únicamente tras aprobación. No se configura una URL canónica ficticia.

## Accesibilidad y límites

Menú móvil con estado expandido y cierre con Escape; enlace para saltar al contenido; foco visible; campos etiquetados y errores asociados; validación por paso y esquema final; movimiento reducido; contraste y diseño de una columna en móvil; estilos de impresión sin navegación. La revisión automática no reemplaza una auditoría de accesibilidad completa ni pruebas con tecnologías de asistencia.

Siguientes etapas: catálogo aprobado, reglas técnicas de aceptación, recepción segura de solicitudes, control de acceso interno, CRM, correo transaccional, gestión de documentación, consentimiento y políticas, protección antiabuso y analítica aprobada. Todo requiere alcance adicional.

## Verificación realizada

- Compilación de producción con TypeScript y Vite completada.
- Cinco pruebas de cálculo y validación aprobadas con Vitest.
- Revisión con Chromium: seis rutas en 1440 px y 390 px sin desbordes horizontales; Inicio también revisado a 320 px.
- Cotización de sólidos completa: errores por campos vacíos y cantidad cero, estimación, confirmación y exportación del resumen a PDF mediante impresión.
- Cotización de especiales completa en móvil: evaluación personalizada y confirmación; sin solicitudes HTTP de escritura.
- Contacto: validación y éxito simulado. Menú móvil: apertura, navegación y cierre al cambiar de ruta. Sin errores JavaScript capturados durante el recorrido.

Capturas y PDF de prueba disponibles localmente en `test-results/` (excluidos de Git). Las pruebas de navegador usaron herramientas ya presentes en el equipo; no agregan una dependencia a la aplicación. El build muestra avisos informativos de comentarios de optimización de Zod que Rollup retira automáticamente; no son errores de compilación.
