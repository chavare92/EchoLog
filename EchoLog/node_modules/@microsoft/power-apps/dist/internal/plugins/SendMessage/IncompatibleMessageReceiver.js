/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
export class IncompatibleMessageReceiver {
    versionInfo;
    incompatibilityDescription;
    isCompatible = false;
    constructor(versionInfo, incompatibilityDescription) {
        this.versionInfo = versionInfo;
        this.incompatibilityDescription = incompatibilityDescription;
    }
}
//# sourceMappingURL=IncompatibleMessageReceiver.js.map