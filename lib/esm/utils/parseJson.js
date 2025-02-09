/**
 * Parses a given string into JSON.
 * Gracefully handles invalid JSON by returning `null`.
 */
export function parseJson(data) {
    try {
        const json = JSON.parse(data);
        return json;
    }
    catch (_) {
        return null;
    }
}
//# sourceMappingURL=parseJson.js.map