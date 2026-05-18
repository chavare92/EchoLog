/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
import type { CompatibleMessageReceiver } from './CompatibleMessageReceiver';
import type { IncompatibleMessageReceiver } from './IncompatibleMessageReceiver';
export type MessageReceiver = CompatibleMessageReceiver | IncompatibleMessageReceiver;
export type CompatibilityCheckerResult = {
    isCompatible: boolean;
    incompatibilityDescription?: string;
};
export interface SendMessagePlugin {
    getMessageReceiverAsync(receiverName: string, isCompatibleChecker: (versionInfo: string) => CompatibilityCheckerResult): Promise<MessageReceiver>;
}
export type CompatibleReceiverMessage = {
    isUpdate: boolean;
    message: string;
};
//# sourceMappingURL=MessageReceiver.Types.d.ts.map