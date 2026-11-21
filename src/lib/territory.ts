/// <reference types="vite/client" />
import { useEffect, useState } from "react";
import { z } from "zod";
import localCatalog from "../config/chile-territory.json";

const catalogSchema = z.array(z.object({
    code: z.string().regex(/^\d{2}$/),
    name: z.string().min(1),
    communes: z.array(z.object({
        code: z.string().regex(/^\d{5}$/),
        name: z.string().min(1),
    })).min(1),
})).min(1);

export function useTerritoryCatalog() {
    const [catalog, setCatalog] = useState<z.infer<typeof catalogSchema>>(localCatalog);

    useEffect(() => {
        const api = import.meta.env.VITE_POSTGREST_URL?.replace(/\/+$/, "");
        if (!api) return;
        const controller = new AbortController();
        const params = new URLSearchParams({
            select: "code,name,communes(code,name)",
            order: "position",
            "communes.order": "name",
        });
        fetch(`${api}/regions?${params}`, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) return;
                const parsed = catalogSchema.safeParse(await response.json());
                if (parsed.success && !controller.signal.aborted) setCatalog(parsed.data);
            })
            .catch(() => {
                // The bundled catalog remains available if the API cannot be reached.
            });
        return () => controller.abort();
    }, []);

    return catalog;
}

export function territoryName(value: string) {
    return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
        .trim().replace(/^region (?:de |del |de la )?/, "").replace(/[^a-z0-9]/g, "");
}
