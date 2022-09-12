import { Headers } from 'headers-polyfill/lib';
import { invariant } from 'outvariant';
import { decodeBuffer } from './utils/bufferUtils';
import { uuidv4 } from './utils/uuid';
export class IsomorphicRequest {
    id;
    url;
    method;
    headers;
    credentials;
    _body;
    _bodyUsed;
    constructor(input, init = {}) {
        const defaultBody = new ArrayBuffer(0);
        this._bodyUsed = false;
        if (input instanceof IsomorphicRequest) {
            this.id = input.id;
            this.url = input.url;
            this.method = input.method;
            this.headers = input.headers;
            this.credentials = input.credentials;
            this._body = input._body || defaultBody;
            return;
        }
        this.id = uuidv4();
        this.url = input;
        this.method = init.method || 'GET';
        this.headers = new Headers(init.headers);
        this.credentials = init.credentials || 'same-origin';
        this._body = init.body || defaultBody;
    }
    get bodyUsed() {
        return this._bodyUsed;
    }
    async text() {
        invariant(!this.bodyUsed, 'Failed to execute "text" on "IsomorphicRequest": body buffer already read');
        this._bodyUsed = true;
        return decodeBuffer(this._body);
    }
    async json() {
        invariant(!this.bodyUsed, 'Failed to execute "json" on "IsomorphicRequest": body buffer already read');
        this._bodyUsed = true;
        const text = decodeBuffer(this._body);
        return JSON.parse(text);
    }
    async arrayBuffer() {
        invariant(!this.bodyUsed, 'Failed to execute "arrayBuffer" on "IsomorphicRequest": body buffer already read');
        this._bodyUsed = true;
        return this._body;
    }
    clone() {
        return new IsomorphicRequest(this);
    }
}
//# sourceMappingURL=IsomorphicRequest.js.map