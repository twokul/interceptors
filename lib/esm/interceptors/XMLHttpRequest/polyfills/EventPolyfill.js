export class EventPolyfill {
    AT_TARGET = 0;
    BUBBLING_PHASE = 0;
    CAPTURING_PHASE = 0;
    NONE = 0;
    type = '';
    srcElement = null;
    target;
    currentTarget = null;
    eventPhase = 0;
    timeStamp;
    isTrusted = true;
    composed = false;
    cancelable = true;
    defaultPrevented = false;
    bubbles = true;
    lengthComputable = true;
    loaded = 0;
    total = 0;
    cancelBubble = false;
    returnValue = true;
    constructor(type, options) {
        this.type = type;
        this.target = options?.target || null;
        this.currentTarget = options?.currentTarget || null;
        this.timeStamp = Date.now();
    }
    composedPath() {
        return [];
    }
    initEvent(type, bubbles, cancelable) {
        this.type = type;
        this.bubbles = !!bubbles;
        this.cancelable = !!cancelable;
    }
    preventDefault() {
        this.defaultPrevented = true;
    }
    stopPropagation() { }
    stopImmediatePropagation() { }
}
//# sourceMappingURL=EventPolyfill.js.map