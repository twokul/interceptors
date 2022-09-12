import { debug } from 'debug';
import { StrictEventEmitter } from 'strict-event-emitter';
import { nextTick } from './nextTick';
export var AsyncEventEmitterReadyState;
(function (AsyncEventEmitterReadyState) {
    AsyncEventEmitterReadyState["ACTIVE"] = "ACTIVE";
    AsyncEventEmitterReadyState["DEACTIVATED"] = "DEACTIVATED";
})(AsyncEventEmitterReadyState || (AsyncEventEmitterReadyState = {}));
export class AsyncEventEmitter extends StrictEventEmitter {
    readyState;
    log;
    queue;
    constructor() {
        super();
        this.log = debug('async-event-emitter');
        this.queue = new Map();
        this.readyState = AsyncEventEmitterReadyState.ACTIVE;
    }
    on(event, listener) {
        const log = this.log.extend('on');
        log('adding "%s" listener...', event);
        if (this.readyState === AsyncEventEmitterReadyState.DEACTIVATED) {
            log('the emitter is destroyed, skipping!');
            return this;
        }
        return super.on(event, (async (...args) => {
            // Event queue is always established when calling ".emit()".
            const queue = this.openListenerQueue(event);
            log('awaiting the "%s" listener...', event);
            // Whenever a listener is called, create a new Promise
            // that resolves when that listener function completes its execution.
            queue.push({
                args,
                done: new Promise(async (resolve, reject) => {
                    try {
                        // Treat listeners as potentially asynchronous functions
                        // so they could be awaited.
                        await listener(...args);
                        resolve();
                        log('"%s" listener has resolved!', event);
                    }
                    catch (error) {
                        log('"%s" listener has rejected!', error);
                        reject(error);
                    }
                }),
            });
        }));
    }
    emit(event, ...args) {
        const log = this.log.extend('emit');
        log('emitting "%s" event...', event);
        if (this.readyState === AsyncEventEmitterReadyState.DEACTIVATED) {
            log('the emitter is destroyed, skipping!');
            return false;
        }
        // Establish the Promise queue for this particular event.
        this.openListenerQueue(event);
        log('appending a one-time cleanup "%s" listener...', event);
        // Append a one-time clean up listener.
        this.once(event, (() => {
            // Clear the Promise queue for this particular event
            // in the next tick so the Promise in "untilIdle" has
            // time to properly resolve.
            nextTick(() => {
                this.queue.delete(event);
                log('cleaned up "%s" listeners queue!', event);
            });
        }));
        return super.emit(event, ...args);
    }
    /**
     * Returns a promise that resolves when all the listeners for the given event
     * has been called. Awaits asynchronous listeners.
     * If the event has no listeners, resolves immediately.
     */
    async untilIdle(event, filter = () => true) {
        const listenersQueue = this.queue.get(event) || [];
        await Promise.all(listenersQueue.filter(filter).map(({ done }) => done)).finally(() => {
            // Clear the queue one the promise settles
            // so that different events don't share the same queue.
            this.queue.delete(event);
        });
    }
    openListenerQueue(event) {
        const log = this.log.extend('openListenerQueue');
        log('opening "%s" listeners queue...', event);
        const queue = this.queue.get(event);
        if (!queue) {
            log('no queue found, creating one...');
            this.queue.set(event, []);
            return [];
        }
        log('returning an exising queue:', queue);
        return queue;
    }
    removeAllListeners(event) {
        const log = this.log.extend('removeAllListeners');
        log('event:', event);
        if (event) {
            this.queue.delete(event);
            log('cleared the "%s" listeners queue!', event, this.queue.get(event));
        }
        else {
            this.queue.clear();
            log('cleared the listeners queue!', this.queue);
        }
        return super.removeAllListeners(event);
    }
    activate() {
        const log = this.log.extend('activate');
        this.readyState = AsyncEventEmitterReadyState.ACTIVE;
        log('set state to:', this.readyState);
    }
    /**
     * Deactivate this event emitter.
     * Deactivated emitter can no longer emit and listen to events
     * and needs to be activated again in order to do so.
     */
    deactivate() {
        const log = this.log.extend('deactivate');
        log('removing all listeners...');
        this.removeAllListeners();
        this.readyState = AsyncEventEmitterReadyState.DEACTIVATED;
        log('set state to:', this.readyState);
    }
}
//# sourceMappingURL=AsyncEventEmitter.js.map