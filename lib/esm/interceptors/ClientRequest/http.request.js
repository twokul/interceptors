import { debug } from 'debug';
import { NodeClientRequest, } from './NodeClientRequest';
import { normalizeClientRequestArgs, } from './utils/normalizeClientRequestArgs';
const log = debug('http request');
export function request(protocol, options) {
    return (...args) => {
        log('request call (protocol "%s"):', protocol, args);
        const clientRequestArgs = normalizeClientRequestArgs(`${protocol}:`, ...args);
        return new NodeClientRequest(clientRequestArgs, options);
    };
}
//# sourceMappingURL=http.request.js.map