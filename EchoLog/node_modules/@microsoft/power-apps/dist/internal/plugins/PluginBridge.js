/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
import { DefaultPowerAppsBridge } from './DefaultPowerAppsBridge';
let bridgePromise;
export async function executePluginAsync(pluginName, pluginAction, params = [], update) {
    const powerAppsBridge = await getBridge();
    return powerAppsBridge.executePluginAsync(pluginName, pluginAction, params, update);
}
async function getBridge() {
    if (!bridgePromise) {
        bridgePromise = (async () => {
            const bridge = window && window.powerAppsBridge ? window.powerAppsBridge : new DefaultPowerAppsBridge();
            await bridge.initialize();
            return bridge;
        })();
    }
    return bridgePromise;
}
//# sourceMappingURL=PluginBridge.js.map