import { describe, expect, it, vi } from "vitest";
import { matchesHouseNumber, matchesStreet, parseAddress } from "./addressSearch";
import { sameSuggestion, searchAddress, toSuggestion, type PhotonFeature } from "./photon";

describe("búsqueda de direcciones de retiro", () => {
    it("expande abreviaturas pegadas al nombre y separa el número y la referencia", () => {
        expect(parseAddress("Av.Pdte. Kennedy N° 5413, entrada norte")).toEqual({
            street: "Avenida Presidente Kennedy",
            number: "5413",
            reference: "entrada norte",
        });
    });

    it("compara nombres equivalentes y descarta otras calles con el mismo número", () => {
        expect(matchesStreet("Av. Providencia", "Avenida Providencia", true)).toBe(true);
        expect(matchesStreet("Av. Providencia", "Avenida Salvador", true)).toBe(false);
        expect(matchesStreet("Pje. Los Aromos", "Avenida Los Aromos", true)).toBe(false);
        expect(matchesStreet("Av. Providen", "Avenida Providencia", false)).toBe(true);
    });

    it("reconoce numeración con sufijo y conserva las referencias rurales", () => {
        expect(parseAddress("Cno.El Escorial#123-A, portón sur")).toEqual({
            street: "Camino El Escorial", number: "123-A", reference: "portón sur",
        });
        expect(parseAddress("Camino El Escorial km 4, parcela 12")).toEqual({
            street: "Camino El Escorial", number: "", reference: "km 4, parcela 12",
        });
        expect(matchesHouseNumber("123-A", "123a")).toBe(true);
        expect(matchesHouseNumber("123-A", "123")).toBe(false);
    });
});

describe("precisión de los resultados de Photon", () => {
    const query = { street: "Av. Argentina", number: "860", commune: "Valparaíso", region: "Valparaíso" };
    const house: PhotonFeature = {
        properties: {
            countrycode: "CL", type: "house", street: "Avenida Argentina", housenumber: "860",
            city: "Valparaíso", state: "Región de Valparaíso",
        },
        geometry: { coordinates: [-71.6024481, -33.0523083] },
    };
    const street: PhotonFeature = {
        ...house,
        properties: { ...house.properties, type: "street", street: undefined, name: "Avenida Argentina", housenumber: undefined },
    };

    it("conserva el punto de un número coincidente y ordena las coordenadas latitud-longitud", () => {
        expect(toSuggestion(house, query)).toMatchObject({
            address: "Avenida Argentina 860", point: [-33.0523083, -71.6024481], commune: "Valparaíso",
        });
    });

    it("usa una calle sin número como centro y nunca le añade la numeración solicitada", () => {
        for (const number of ["", "9999999"]) {
            expect(toSuggestion(street, { ...query, number })).toMatchObject({
                address: "Avenida Argentina", point: null, center: [-33.0523083, -71.6024481],
            });
        }
        expect(toSuggestion(house, { ...query, number: "9999999" })).toBeNull();
    });

    it("distingue Viña del Mar y descarta resultados fuera de la comuna, región o país", () => {
        const vina = { ...house, properties: { ...house.properties, street: "Arlegui", housenumber: "646", city: "Viña del Mar" } };
        const input = { ...query, street: "Arlegui", number: "646", commune: "Viña del Mar" };
        expect(toSuggestion(vina, input)?.point).toBeTruthy();
        expect(toSuggestion(vina, { ...input, commune: "Valparaíso" })).toBeNull();
        expect(toSuggestion(vina, { ...input, region: "Coquimbo" })).toBeNull();
        expect(toSuggestion({ ...vina, properties: { ...vina.properties, countrycode: "AR" } }, input)).toBeNull();
    });

    it("agrupa los tramos de El Vergel cuando Photon no verifica el 816", () => {
        const input = { ...query, street: "el vergel", number: "816" };
        const feature = { ...street, properties: { ...street.properties, name: "Camino El Vergel", osm_id: 1 } };
        const first = toSuggestion(feature, input)!;
        const second = toSuggestion({ ...feature, properties: { ...feature.properties, name: "El Vergel", osm_id: 2 } }, input)!;
        expect(first.point).toBeNull();
        expect(second.point).toBeNull();
        expect(sameSuggestion(first, second)).toBe(true);
        expect(sameSuggestion(first, { ...second, city: "Viña del Mar" })).toBe(false);
        expect(sameSuggestion(first, { ...second, point: second.center })).toBe(false);
    });

    it("reintenta El Vergel 816 con el nombre devuelto por Photon y conserva el contexto geográfico", async () => {
        const calls: URL[] = [];
        const fetchMock = vi.fn(async (url: string) => {
            const request = new URL(url);
            calls.push(request);
            const name = request.searchParams.get("street");
            const features = name === "el vergel" ? [
                { ...street, properties: { ...street.properties, name: "Camino El Vergel" } },
            ] : name === "Camino El Vergel" ? [
                { ...house, properties: { ...house.properties, street: name, housenumber: "816" } },
            ] : [];
            return Response.json({ features });
        });
        vi.stubGlobal("fetch", fetchMock);
        try {
            const outcome = await searchAddress({ ...query, street: "el vergel", number: "816" }, new AbortController().signal);
            expect(outcome.suggestions).toMatchObject([{ address: "Camino El Vergel 816", point: expect.any(Array) }]);
            const retry = calls.find((call) => call.searchParams.get("street") === "Camino El Vergel")!;
            expect(Object.fromEntries(retry.searchParams)).toMatchObject({
                housenumber: "816", layer: "house", city: "Valparaíso", state: "Valparaíso", countrycode: "CL",
            });
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("devuelve una lista vacía para una dirección inexistente", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({ features: [] })));
        try {
            await expect(searchAddress({ ...query, street: "Calle Inexistente para prueba", number: "9187" },
                new AbortController().signal)).resolves.toEqual({ suggestions: [], failed: false });
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("trata un punto interpolado como referencia", () => {
        expect(toSuggestion({ ...house, properties: { ...house.properties, osm_type: "I" } }, query)?.point).toBeNull();
    });
});
