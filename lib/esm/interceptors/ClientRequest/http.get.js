import { NodeClientRequest, } from './NodeClientRequest';
import { normalizeClientRequestArgs, } from './utils/normalizeClientRequestArgs';
export function get(protocol, options) {
    return (...args) => {
        const clientRequestArgs = normalizeClientRequestArgs(`${protocol}:`, ...args);
        const request = new NodeClientRequest(clientRequestArgs, options);
        /**
         * @note https://nodejs.org/api/http.html#httpgetoptions-callback
         * "http.get" sets the method to "GET" and calls "req.end()" automatically.
         */
        request.end();
        return request;
    };
}
//# sourceMappingURL=http.get.js.map