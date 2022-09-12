import { until } from '@open-draft/until';
import { Headers, stringToHeaders, objectToHeaders, headersToString, } from 'headers-polyfill';
import { DOMParser } from '@xmldom/xmldom';
import { parseJson } from '../../utils/parseJson';
import { toIsoResponse } from '../../utils/toIsoResponse';
import { bufferFrom } from './utils/bufferFrom';
import { createEvent } from './utils/createEvent';
import { IsomorphicRequest } from '../../IsomorphicRequest';
import { encodeBuffer } from '../../utils/bufferUtils';
import { InteractiveIsomorphicRequest } from '../../InteractiveIsomorphicRequest';
export const createXMLHttpRequestOverride = (options) => {
    const { XMLHttpRequest, emitter, log } = options;
    return class XMLHttpRequestOverride {
        _requestHeaders;
        _responseHeaders;
        // Collection of events modified by `addEventListener`/`removeEventListener` calls.
        _events = [];
        log = log;
        /* Request state */
        static UNSENT = 0;
        static OPENED = 1;
        static HEADERS_RECEIVED = 2;
        static LOADING = 3;
        static DONE = 4;
        UNSENT = 0;
        OPENED = 1;
        HEADERS_RECEIVED = 2;
        LOADING = 3;
        DONE = 4;
        /* Custom public properties */
        method;
        url;
        /* XHR public properties */
        withCredentials;
        status;
        statusText;
        user;
        password;
        async;
        response;
        responseText;
        responseType;
        responseXML;
        responseURL;
        upload;
        readyState;
        onreadystatechange = null;
        timeout;
        /* Events */
        onabort = null;
        onerror = null;
        onload = null;
        onloadend = null;
        onloadstart = null;
        onprogress = null;
        ontimeout = null;
        constructor() {
            this.url = '';
            this.method = 'GET';
            this.readyState = this.UNSENT;
            this.withCredentials = false;
            this.status = 200;
            this.statusText = 'OK';
            this.response = '';
            this.responseType = 'text';
            this.responseText = '';
            this.responseXML = null;
            this.responseURL = '';
            this.upload = {};
            this.timeout = 0;
            this._requestHeaders = new Headers();
            this._responseHeaders = new Headers();
        }
        setReadyState(nextState) {
            if (nextState === this.readyState) {
                return;
            }
            this.log('readyState change %d -> %d', this.readyState, nextState);
            this.readyState = nextState;
            if (nextState !== this.UNSENT) {
                this.log('triggering readystate change...');
                this.trigger('readystatechange');
            }
        }
        /**
         * Triggers both direct callback and attached event listeners
         * for the given event.
         */
        trigger(eventName, options) {
            this.log('trigger "%s" (%d)', eventName, this.readyState);
            this.log('resolve listener for event "%s"', eventName);
            // @ts-expect-error XMLHttpRequest class has no index signature.
            const callback = this[`on${eventName}`];
            callback?.call(this, createEvent(this, eventName, options));
            for (const event of this._events) {
                if (event.name === eventName) {
                    log('calling mock event listener "%s" (%d)', eventName, this.readyState);
                    event.listener.call(this, createEvent(this, eventName, options));
                }
            }
            return this;
        }
        reset() {
            this.log('reset');
            this.setReadyState(this.UNSENT);
            this.status = 200;
            this.statusText = 'OK';
            this.response = null;
            this.responseText = null;
            this.responseXML = null;
            this._requestHeaders = new Headers();
            this._responseHeaders = new Headers();
        }
        async open(method, url, async = true, user, password) {
            this.log = this.log.extend(`request ${method} ${url}`);
            this.log('open', { method, url, async, user, password });
            this.reset();
            this.setReadyState(this.OPENED);
            if (typeof url === 'undefined') {
                this.url = method;
                this.method = 'GET';
            }
            else {
                this.url = url;
                this.method = method;
                this.async = async;
                this.user = user;
                this.password = password;
            }
        }
        send(data) {
            this.log('send %s %s', this.method, this.url);
            let buffer;
            if (typeof data === 'string') {
                buffer = encodeBuffer(data);
            }
            else {
                buffer = data || new ArrayBuffer(0);
            }
            let url;
            try {
                url = new URL(this.url);
            }
            catch (error) {
                // Assume a relative URL, if construction of a new `URL` instance fails.
                // Since `XMLHttpRequest` always executed in a DOM-like environment,
                // resolve the relative request URL against the current window location.
                url = new URL(this.url, window.location.href);
            }
            this.log('request headers', this._requestHeaders);
            // Create an intercepted request instance exposed to the request intercepting middleware.
            const isomorphicRequest = new IsomorphicRequest(url, {
                body: buffer,
                method: this.method,
                headers: this._requestHeaders,
                credentials: this.withCredentials ? 'include' : 'omit',
            });
            const interactiveIsomorphicRequest = new InteractiveIsomorphicRequest(isomorphicRequest);
            this.log('emitting the "request" event for %d listener(s)...', emitter.listenerCount('request'));
            emitter.emit('request', interactiveIsomorphicRequest);
            this.log('awaiting mocked response...');
            Promise.resolve(until(async () => {
                await emitter.untilIdle('request', ({ args: [request] }) => {
                    return request.id === interactiveIsomorphicRequest.id;
                });
                this.log('all request listeners have been resolved!');
                const [mockedResponse] = await interactiveIsomorphicRequest.respondWith.invoked();
                this.log('event.respondWith called with:', mockedResponse);
                return mockedResponse;
            })).then(([middlewareException, mockedResponse]) => {
                // When the request middleware throws an exception, error the request.
                // This cancels the request and is similar to a network error.
                if (middlewareException) {
                    this.log('middleware function threw an exception!', middlewareException);
                    // No way to propagate the actual error message.
                    this.trigger('error');
                    this.abort();
                    return;
                }
                // Return a mocked response, if provided in the middleware.
                if (mockedResponse) {
                    this.log('received mocked response', mockedResponse);
                    // Trigger a loadstart event to indicate the initialization of the fetch.
                    this.trigger('loadstart');
                    this.status = mockedResponse.status ?? 200;
                    this.statusText = mockedResponse.statusText || 'OK';
                    this._responseHeaders = mockedResponse.headers
                        ? objectToHeaders(mockedResponse.headers)
                        : new Headers();
                    this.log('set response status', this.status, this.statusText);
                    this.log('set response headers', this._responseHeaders);
                    // Mark that response headers has been received
                    // and trigger a ready state event to reflect received headers
                    // in a custom `onreadystatechange` callback.
                    this.setReadyState(this.HEADERS_RECEIVED);
                    this.log('response type', this.responseType);
                    this.response = this.getResponseBody(mockedResponse.body);
                    this.responseURL = this.url;
                    this.responseText = mockedResponse.body || '';
                    this.responseXML = this.getResponseXML();
                    this.log('set response body', this.response);
                    if (mockedResponse.body && this.response) {
                        this.setReadyState(this.LOADING);
                        // Presence of the mocked response implies a response body (not null).
                        // Presence of the coerced `this.response` implies the mocked body is valid.
                        const bodyBuffer = bufferFrom(mockedResponse.body);
                        // Trigger a progress event based on the mocked response body.
                        this.trigger('progress', {
                            loaded: bodyBuffer.length,
                            total: bodyBuffer.length,
                        });
                    }
                    /**
                     * Explicitly mark the request as done so its response never hangs.
                     * @see https://github.com/mswjs/interceptors/issues/13
                     */
                    this.setReadyState(this.DONE);
                    // Trigger a load event to indicate the fetch has succeeded.
                    this.trigger('load');
                    // Trigger a loadend event to indicate the fetch has completed.
                    this.trigger('loadend');
                    emitter.emit('response', isomorphicRequest, toIsoResponse(mockedResponse));
                }
                else {
                    this.log('no mocked response received!');
                    // Perform an original request, when the request middleware returned no mocked response.
                    const originalRequest = new XMLHttpRequest();
                    this.log('opening an original request %s %s', this.method, this.url);
                    originalRequest.open(this.method, this.url, this.async ?? true, this.user, this.password);
                    // Reflect a successful state of the original request
                    // on the patched instance.
                    originalRequest.addEventListener('load', () => {
                        this.log('original "onload"');
                        this.status = originalRequest.status;
                        this.statusText = originalRequest.statusText;
                        this.responseURL = originalRequest.responseURL;
                        this.responseType = originalRequest.responseType;
                        this.response = originalRequest.response;
                        this.responseText = originalRequest.responseText;
                        this.responseXML = originalRequest.responseXML;
                        this.log('set mock request readyState to DONE');
                        // Explicitly mark the mocked request instance as done
                        // so the response never hangs.
                        /**
                         * @note `readystatechange` listener is called TWICE
                         * in the case of unhandled request.
                         */
                        this.setReadyState(this.DONE);
                        this.log('received original response', this.status, this.statusText);
                        this.log('original response body:', this.response);
                        const responseHeaders = originalRequest.getAllResponseHeaders();
                        this.log('original response headers:\n', responseHeaders);
                        this._responseHeaders = stringToHeaders(responseHeaders);
                        this.log('original response headers (normalized)', this._responseHeaders);
                        this.log('original response finished');
                        emitter.emit('response', isomorphicRequest, {
                            status: originalRequest.status,
                            statusText: originalRequest.statusText,
                            headers: this._responseHeaders,
                            body: originalRequest.response,
                        });
                    });
                    // Assign callbacks and event listeners from the intercepted XHR instance
                    // to the original XHR instance.
                    this.propagateCallbacks(originalRequest);
                    this.propagateListeners(originalRequest);
                    this.propagateHeaders(originalRequest, this._requestHeaders);
                    if (this.async) {
                        originalRequest.timeout = this.timeout;
                    }
                    this.log('send', data);
                    originalRequest.send(data);
                }
            });
        }
        abort() {
            this.log('abort');
            if (this.readyState > this.UNSENT && this.readyState < this.DONE) {
                this.setReadyState(this.UNSENT);
                this.trigger('abort');
            }
        }
        dispatchEvent() {
            return false;
        }
        setRequestHeader(name, value) {
            this.log('set request header "%s" to "%s"', name, value);
            this._requestHeaders.append(name, value);
        }
        getResponseHeader(name) {
            this.log('get response header "%s"', name);
            if (this.readyState < this.HEADERS_RECEIVED) {
                this.log('cannot return a header: headers not received (state: %s)', this.readyState);
                return null;
            }
            const headerValue = this._responseHeaders.get(name);
            this.log('resolved response header "%s" to "%s"', name, headerValue, this._responseHeaders);
            return headerValue;
        }
        getAllResponseHeaders() {
            this.log('get all response headers');
            if (this.readyState < this.HEADERS_RECEIVED) {
                this.log('cannot return headers: headers not received (state: %s)', this.readyState);
                return '';
            }
            return headersToString(this._responseHeaders);
        }
        addEventListener(name, listener) {
            this.log('addEventListener', name, listener);
            this._events.push({
                name,
                listener,
            });
        }
        removeEventListener(name, listener) {
            this.log('removeEventListener', name, listener);
            this._events = this._events.filter((storedEvent) => {
                return storedEvent.name !== name && storedEvent.listener !== listener;
            });
        }
        overrideMimeType() { }
        /**
         * Resolves the response based on the `responseType` value.
         */
        getResponseBody(body) {
            // Handle an improperly set "null" value of the mocked response body.
            const textBody = body ?? '';
            this.log('coerced response body to', textBody);
            switch (this.responseType) {
                case 'json': {
                    this.log('resolving response body as JSON');
                    return parseJson(textBody);
                }
                case 'blob': {
                    const blobType = this.getResponseHeader('content-type') || 'text/plain';
                    this.log('resolving response body as Blob', { type: blobType });
                    return new Blob([textBody], {
                        type: blobType,
                    });
                }
                case 'arraybuffer': {
                    this.log('resolving response body as ArrayBuffer');
                    const arrayBuffer = bufferFrom(textBody);
                    return arrayBuffer;
                }
                default:
                    return textBody;
            }
        }
        getResponseXML() {
            const contentType = this.getResponseHeader('Content-Type');
            if (contentType === 'application/xml' || contentType === 'text/xml') {
                return new DOMParser().parseFromString(this.responseText, contentType);
            }
            return null;
        }
        /**
         * Propagates mock XMLHttpRequest instance callbacks
         * to the given XMLHttpRequest instance.
         */
        propagateCallbacks(request) {
            this.log('propagating request callbacks to the original request');
            const callbackNames = [
                'abort',
                'onerror',
                'ontimeout',
                'onload',
                'onloadstart',
                'onloadend',
                'onprogress',
                'onreadystatechange',
            ];
            for (const callbackName of callbackNames) {
                const callback = this[callbackName];
                if (callback) {
                    request[callbackName] = this[callbackName];
                    this.log('propagated the "%s" callback', callbackName, callback);
                }
            }
            request.onabort = this.abort;
            request.onerror = this.onerror;
            request.ontimeout = this.ontimeout;
            request.onload = this.onload;
            request.onloadstart = this.onloadstart;
            request.onloadend = this.onloadend;
            request.onprogress = this.onprogress;
            request.onreadystatechange = this.onreadystatechange;
        }
        /**
         * Propagates the mock XMLHttpRequest instance listeners
         * to the given XMLHttpRequest instance.
         */
        propagateListeners(request) {
            this.log('propagating request listeners (%d) to the original request', this._events.length, this._events);
            this._events.forEach(({ name, listener }) => {
                request.addEventListener(name, listener);
            });
        }
        propagateHeaders(request, headers) {
            this.log('propagating request headers to the original request', headers);
            // Preserve the request headers casing.
            Object.entries(headers.raw()).forEach(([name, value]) => {
                this.log('setting "%s" (%s) header on the original request', name, value);
                request.setRequestHeader(name, value);
            });
        }
    };
};
//# sourceMappingURL=XMLHttpRequestOverride.js.map