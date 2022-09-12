import http from 'http';
import https from 'https';
import { invariant } from 'outvariant';
import { IS_PATCHED_MODULE } from '../../glossary';
import { Interceptor } from '../../Interceptor';
import { get } from './http.get';
import { request } from './http.request';
/**
 * Intercept requests made via the `ClientRequest` class.
 * Such requests include `http.get`, `https.request`, etc.
 */
export class ClientRequestInterceptor extends Interceptor {
    static symbol = Symbol('http');
    modules;
    constructor() {
        super(ClientRequestInterceptor.symbol);
        this.modules = new Map();
        this.modules.set('http', http);
        this.modules.set('https', https);
    }
    setup() {
        const log = this.log.extend('setup');
        for (const [protocol, requestModule] of this.modules) {
            const { request: pureRequest, get: pureGet } = requestModule;
            invariant(!requestModule[IS_PATCHED_MODULE], 'Failed to patch the "%s" module: already patched.', protocol);
            this.subscriptions.push(() => {
                Object.defineProperty(requestModule, IS_PATCHED_MODULE, {
                    value: undefined,
                });
                requestModule.request = pureRequest;
                requestModule.get = pureGet;
                log('native "%s" module restored!', protocol);
            });
            const options = {
                emitter: this.emitter,
                log: this.log,
            };
            // @ts-ignore
            requestModule.request =
                // Force a line break.
                request(protocol, options);
            // @ts-ignore
            requestModule.get =
                // Force a line break.
                get(protocol, options);
            Object.defineProperty(requestModule, IS_PATCHED_MODULE, {
                configurable: true,
                enumerable: true,
                value: true,
            });
            log('native "%s" module patched!', protocol);
        }
    }
}
//# sourceMappingURL=index.js.map