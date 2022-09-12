import { Interceptor } from './Interceptor';
/**
 * A batch interceptor that exposes a single interface
 * to apply and operate with multiple interceptors at once.
 */
export class BatchInterceptor extends Interceptor {
    static symbol;
    interceptors;
    constructor(options) {
        BatchInterceptor.symbol = Symbol(options.name);
        super(BatchInterceptor.symbol);
        this.interceptors = options.interceptors;
    }
    setup() {
        const log = this.log.extend('setup');
        log('applying all %d interceptors...', this.interceptors.length);
        for (const interceptor of this.interceptors) {
            log('applying "%s" interceptor...', interceptor.constructor.name);
            interceptor.apply();
            log('adding interceptor dispose subscription');
            this.subscriptions.push(() => interceptor.dispose());
        }
    }
    on(event, listener) {
        // Instead of adding a listener to the batch interceptor,
        // propagate the listener to each of the individual interceptors.
        this.interceptors.forEach((interceptor) => {
            interceptor.on(event, listener);
        });
    }
}
//# sourceMappingURL=BatchInterceptor.js.map