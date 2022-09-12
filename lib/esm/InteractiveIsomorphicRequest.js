import { invariant } from 'outvariant';
import { IsomorphicRequest } from './IsomorphicRequest';
import { createLazyCallback } from './utils/createLazyCallback';
export class InteractiveIsomorphicRequest extends IsomorphicRequest {
    respondWith;
    constructor(request) {
        super(request);
        this.respondWith = createLazyCallback({
            maxCalls: 1,
            maxCallsCallback: () => {
                invariant(false, 'Failed to respond to "%s %s" request: the "request" event has already been responded to.', this.method, this.url.href);
            },
        });
    }
}
//# sourceMappingURL=InteractiveIsomorphicRequest.js.map