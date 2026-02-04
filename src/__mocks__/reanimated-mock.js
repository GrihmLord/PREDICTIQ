module.exports = {
    default: {
        createAnimatedComponent: (component) => component,
        timing: () => ({ start: () => { } }),
        spring: () => ({ start: () => { } }),
        decay: () => ({ start: () => { } }),
        Value: class {
            constructor(val) { this.val = val; }
            setValue(val) { this.val = val; }
        },
        event: () => { },
        addWhitelistedNativeProps: () => { },
        addWhitelistedUIProps: () => { },
    },
    __esModule: true,
};
