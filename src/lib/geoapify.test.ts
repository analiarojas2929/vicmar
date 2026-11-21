import { describe, expect, it } from "vitest";
import { geoapifySuggestion, type GeoapifyResult } from "./geoapify";

const query = { street: "Arlegui", number: "646", commune: "Viña del Mar", region: "Valparaíso" };
const building: GeoapifyResult = {
    place_id: "test",
    street: "Arlegui", housenumber: "646", city: "Viña del Mar", state: "Región de Valparaíso",
    country_code: "cl", lat: -33.0239466, lon: -71.5532124, result_type: "building",
    match_type: "full_match", building_confidence: 1,
};

describe("precisión de Geoapify", () => {
    it("propone el punto de un edificio con componentes coincidentes", () => {
        expect(geoapifySuggestion(building, query)).toMatchObject({
            id: "geoapify:test", address: "Arlegui 646", point: [-33.0239466, -71.5532124],
        });
    });
    it("usa una calle o un edificio de baja confianza solo como referencia", () => {
        const street = { ...building, street: "Camino El Vergel", housenumber: undefined, city: "Valparaíso", result_type: "street" };
        expect(geoapifySuggestion(street, { ...query, street: "El Vergel", number: "816", commune: "Valparaíso" }))
            .toMatchObject({ address: "Camino El Vergel", point: null });
        expect(geoapifySuggestion({ ...building, building_confidence: 0.6 }, query)?.point).toBeNull();
        expect(geoapifySuggestion({ ...building, match_type: "match_by_street" }, query)?.point).toBeNull();
    });
    it("descarta números distintos y resultados de otro país, comuna o región", () => {
        expect(geoapifySuggestion({ ...building, housenumber: "648" }, query)).toBeNull();
        expect(geoapifySuggestion({ ...building, country_code: "ar" }, query)).toBeNull();
        expect(geoapifySuggestion({ ...building, city: "Valparaíso" }, query)).toBeNull();
        expect(geoapifySuggestion({ ...building, state: "Coquimbo" }, query)).toBeNull();
    });
});
