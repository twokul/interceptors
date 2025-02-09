import { Headers } from 'headers-polyfill';
import { Interceptor } from './Interceptor';
import { BatchInterceptor } from './BatchInterceptor';
import { ClientRequestInterceptor } from './interceptors/ClientRequest';
import { XMLHttpRequestInterceptor } from './interceptors/XMLHttpRequest';
import { toIsoResponse } from './utils/toIsoResponse';
import { IsomorphicRequest } from './IsomorphicRequest';
import { bufferFrom } from './interceptors/XMLHttpRequest/utils/bufferFrom';
import { InteractiveIsomorphicRequest } from './InteractiveIsomorphicRequest';
export class RemoteHttpInterceptor extends BatchInterceptor {
    constructor() {
        super({
            name: 'remote-interceptor',
            interceptors: [
                new ClientRequestInterceptor(),
                new XMLHttpRequestInterceptor(),
            ],
        });
    }
    setup() {
        super.setup();
        let handleParentMessage;
        this.on('request', async (request) => {
            // Send the stringified intercepted request to
            // the parent process where the remote resolver is established.
            const serializedRequest = JSON.stringify(request);
            this.log('sent serialized request to the child:', serializedRequest);
            process.send?.(`request:${serializedRequest}`);
            const responsePromise = new Promise((resolve) => {
                handleParentMessage = (message) => {
                    if (typeof message !== 'string') {
                        return resolve();
                    }
                    if (message.startsWith(`response:${request.id}`)) {
                        const [, serializedResponse] = message.match(/^response:.+?:(.+)$/) || [];
                        if (!serializedResponse) {
                            return resolve();
                        }
                        const mockedResponse = JSON.parse(serializedResponse);
                        request.respondWith(mockedResponse);
                        resolve();
                    }
                };
            });
            // Listen for the mocked response message from the parent.
            this.log('add "message" listener to the parent process', handleParentMessage);
            process.addListener('message', handleParentMessage);
            return responsePromise;
        });
        this.subscriptions.push(() => {
            process.removeListener('message', handleParentMessage);
        });
    }
}
export function requestReviver(key, value) {
    switch (key) {
        case 'url':
            return new URL(value);
        case 'headers':
            return new Headers(value);
        default:
            return value;
    }
}
export class RemoteHttpResolver extends Interceptor {
    static symbol = Symbol('remote-resolver');
    process;
    constructor(options) {
        super(RemoteHttpResolver.symbol);
        this.process = options.process;
    }
    setup() {
        const log = this.log.extend('setup');
        const handleChildMessage = async (message) => {
            log('received message from child!', message);
            if (typeof message !== 'string' || !message.startsWith('request:')) {
                log('unknown message, ignoring...');
                return;
            }
            const [, serializedRequest] = message.match(/^request:(.+)$/) || [];
            if (!serializedRequest) {
                return;
            }
            const requestJson = JSON.parse(serializedRequest, requestReviver);
            log('parsed intercepted request', requestJson);
            const body = bufferFrom(requestJson.body);
            const isomorphicRequest = new IsomorphicRequest(requestJson.url, {
                ...requestJson,
                body: body.buffer,
            });
            const interactiveIsomorphicRequest = new InteractiveIsomorphicRequest(isomorphicRequest);
            this.emitter.emit('request', interactiveIsomorphicRequest);
            await this.emitter.untilIdle('request', ({ args: [request] }) => {
                return request.id === interactiveIsomorphicRequest.id;
            });
            const [mockedResponse] = await interactiveIsomorphicRequest.respondWith.invoked();
            log('event.respondWith called with:', mockedResponse);
            // Send the mocked response to the child process.
            const serializedResponse = JSON.stringify(mockedResponse);
            this.process.send(`response:${requestJson.id}:${serializedResponse}`, (error) => {
                if (error) {
                    return;
                }
                if (mockedResponse) {
                    // Emit an optimistic "response" event at this point,
                    // not to rely on the back-and-forth signaling for the sake of the event.
                    this.emitter.emit('response', isomorphicRequest, toIsoResponse(mockedResponse));
                }
            });
            log('sent serialized mocked response to the parent:', serializedResponse);
        };
        this.subscriptions.push(() => {
            this.process.removeListener('message', handleChildMessage);
            log('removed the "message" listener from the child process!');
        });
        log('adding a "message" listener to the child process');
        this.process.addListener('message', handleChildMessage);
        this.process.once('error', () => this.dispose());
        this.process.once('exit', () => this.dispose());
    }
}
//# sourceMappingURL=RemoteHttpInterceptor.js.map