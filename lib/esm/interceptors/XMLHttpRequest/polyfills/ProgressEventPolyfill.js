import { EventPolyfill } from './EventPolyfill';
export class ProgressEventPolyfill extends EventPolyfill {
    lengthComputable;
    composed;
    loaded;
    total;
    constructor(type, init) {
        super(type);
        this.lengthComputable = init?.lengthComputable || false;
        this.composed = init?.composed || false;
        this.loaded = init?.loaded || 0;
        this.total = init?.total || 0;
    }
}
//# sourceMappingURL=ProgressEventPolyfill.js.map