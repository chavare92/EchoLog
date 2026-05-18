/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
export { initializeLogger } from './LoggerManager';
import { executePluginAsync } from '../internal/plugins';
import { getAppLoadedPerformanceData } from './Performance';
executePluginAsync('AppLifecycle', 'notifyAppSdkLoaded', [getAppLoadedPerformanceData()]);
//# sourceMappingURL=index.js.map