/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
declare global {
    interface Window {
        powerAppsBridge?: PowerAppsBridge;
    }
}
export type PowerAppsBridge = {
    initialize(): Promise<void>;
    executePluginAsync<T = unknown>(pluginName: string, pluginAction: string, params: unknown[], onUpdate?: (args: unknown) => void): Promise<T>;
};
export declare function executePluginAsync<T = unknown>(pluginName: string, pluginAction: string, params?: unknown[], update?: (args: unknown) => void): Promise<T>;
//# sourceMappingURL=PluginBridge.d.ts.map