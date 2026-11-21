const abbreviations: Record<string, string> = {
    av: "Avenida", avda: "Avenida", pje: "Pasaje", psje: "Pasaje",
    cam: "Camino", cno: "Camino",
    gral: "General", pdte: "Presidente", pres: "Presidente", almte: "Almirante",
};

function expandAddress(value: string) {
    return value.trim().replace(/\b(avda|av|psje|pje|cam|cno|gral|pdte|pres|almte)(?:\.\s*|\s+|$)/gi,
        (_, abbreviation: string) => abbreviations[abbreviation.toLowerCase()] + " ").trim();
}

function normalize(value: string) {
    return expandAddress(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, " ").trim();
}

export function parseAddress(address: string) {
    const [main, ...references] = address.split(",");
    const expanded = expandAddress(main);
    const [streetAddress, ruralReference] = expanded.split(/\s+(?=(?:km\.?|kil[oó]metro|parcela|lote|sitio)\s*\d)/i, 2);
    const match = /^(?:avenida|pasaje|calle|camino|ruta)\s+\d+[a-z]?$/i.test(streetAddress)
        ? null
        : streetAddress.match(/^(.+?)(?:\s+|(?=#))(?:n\.?\s*[°º]\s*|n(?:ro|[uú]m)\.?\s*|#\s*)?(\d+(?:\s*-\s*[a-z]|[a-z])?)$/i);
    return {
        street: match?.[1] ?? streetAddress,
        number: match?.[2].replace(/\s+/g, "") ?? "",
        reference: [ruralReference, ...references].map((part) => part?.trim()).filter(Boolean).join(", "),
    };
}

export function matchesHouseNumber(input: string, candidate: string) {
    const normalizeNumber = (number: string) => number.trim().toLowerCase().replace(/\s*-\s*/g, "");
    return normalizeNumber(input) === normalizeNumber(candidate);
}

export function matchesStreet(input: string, candidate: string, exact: boolean) {
    const inputName = normalize(input);
    const candidateName = normalize(candidate);
    const roadType = /^(avenida|pasaje|calle|camino|ruta) /;
    const inputType = inputName.match(roadType)?.[1];
    const candidateType = candidateName.match(roadType)?.[1];
    if (inputType && candidateType && inputType !== candidateType) return false;
    const wanted = inputName.replace(roadType, "");
    const found = candidateName.replace(roadType, "");
    return exact ? wanted === found : found.startsWith(wanted);
}
