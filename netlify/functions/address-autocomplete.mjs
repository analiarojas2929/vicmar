import { lookupAddress } from "../../server/address-autocomplete.mjs";

export const config = {
    path: "/api/address-autocomplete",
    rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export default function autocomplete(request) {
    return lookupAddress(request, process.env.GEOAPIFY_API_KEY);
}
