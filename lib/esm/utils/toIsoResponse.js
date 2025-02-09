import { objectToHeaders } from 'headers-polyfill';
/**
 * Converts a given mocked response object into an isomorphic response.
 */
export function toIsoResponse(response) {
    return {
        status: response.status ?? 200,
        statusText: response.statusText || 'OK',
        headers: objectToHeaders(response.headers || {}),
        body: response.body,
    };
}
//# sourceMappingURL=toIsoResponse.js.map