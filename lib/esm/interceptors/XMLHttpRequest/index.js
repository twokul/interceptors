import { invariant } from 'outvariant';
import { IS_PATCHED_MODULE } from '../../glossary';
import { Interceptor } from '../../Interceptor';
import { createXMLHttpRequestOverride } from './XMLHttpRequestOverride';
export class XMLHttpRequestInterceptor extends Interceptor {
    static symbol = Symbol('xhr');
    constructor() {
        super(XMLHttpRequestInterceptor.symbol);
    }
    checkEnvironment() {
        return (typeof window !== 'undefined' &&
            typeof window.XMLHttpRequest !== 'undefined');
    }
    setup() {
        const log = this.log.extend('setup');
        log('patching "XMLHttpRequest" module...');
        const PureXMLHttpRequest = window.XMLHttpRequest;
        invariant(!PureXMLHttpRequest[IS_PATCHED_MODULE], 'Failed to patch the "XMLHttpRequest" module: already patched.');
        window.XMLHttpRequest = createXMLHttpRequestOverride({
            XMLHttpRequest: PureXMLHttpRequest,
            emitter: this.emitter,
            log: this.log,
        });
        log('native "XMLHttpRequest" module patched!', window.XMLHttpRequest.name);
        Object.defineProperty(window.XMLHttpRequest, IS_PATCHED_MODULE, {
            enumerable: true,
            configurable: true,
            value: true,
        });
        this.subscriptions.push(() => {
            Object.defineProperty(window.XMLHttpRequest, IS_PATCHED_MODULE, {
                value: undefined,
            });
            window.XMLHttpRequest = PureXMLHttpRequest;
            log('native "XMLHttpRequest" module restored!', window.XMLHttpRequest.name);
        });
    }
}
//# sourceMappingURL=index.js.map