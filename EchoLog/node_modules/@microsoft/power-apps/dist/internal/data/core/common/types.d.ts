/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
import type { DataSourcesInfo, IOperationResult } from '../types';
import type { DataverseMetadataRequest } from '../types/dataverseMetadata';
/**
 * Base interface for operation context
 */
export interface IOperationContext {
    isExecuteAsync?: boolean;
    clientConfig?: IClientConfig;
    operationName?: string;
    correlationId?: string;
    timestamp?: Date;
    responseInfo?: Record<string, IApiResponseInfo>;
    batchId?: string;
    datasetName?: string;
    isDataVerseOperation?: boolean;
    fileName?: string;
    skipBatch?: boolean;
}
export interface IApiResponseInfo {
    type?: string | null;
    format?: string | null;
}
/**
 * Base interface for client configuration
 */
export interface IClientConfig {
    baseUrl?: string;
    timeout?: number;
    retryAttempts?: number;
}
/**
 * Interface for HTTP request configuration
 */
export interface IHttpRequestConfig {
    url: string;
    method: HttpMethod;
    apiId: string;
    tableName: string;
    headers?: {
        [key: string]: string;
    };
    body?: string | Uint8Array | ArrayBuffer | Blob;
}
/**
 * Interface for HTTP request headers
 */
export interface IHttpHeaders {
    Accept: string;
    'x-ms-protocol-semantics': string;
    ServiceNamespace: string;
    Authorization: string;
    'x-ms-pa-client-custom-headers-options': string;
    'x-ms-enable-selects': string;
    'x-ms-pa-client-telemetry-options': string;
    'x-ms-pa-client-telemetry-additional-data': string;
    BatchInfo?: string;
}
/**
 * HTTP methods supported by the client
 */
export declare enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH"
}
/**
 * Interface for OData response format
 * @template T The type of data in the response
 */
export interface ODataResponse<T> {
    '@odata.context'?: string;
    '@odata.count'?: number;
    value: T;
}
/**
 * Interface for metadata operation configuration
 */
export interface IMetadataOperationConfig {
    service: string;
    action: string;
    params?: unknown[];
}
/**
 * Interface for operation execution result
 */
export type OperationExecutionResponse = [Record<string, object>, ArrayBuffer];
/**
 * Type alias for possible response data formats
 */
export type ResponseData = Record<string, unknown> | ArrayBuffer;
/**
 * Type alias for request body in data operations
 */
export type RequestBody = Record<string, unknown>;
/**
 * Interface for connection API details
 */
export interface IConnectionApi {
    path: string;
    method?: string;
    parameters?: string[];
}
/**
 * Interface for connection reference details
 */
export interface IConnectionReference {
    apiId?: string;
    connectionName?: string;
    datasetName?: string;
    datasetNameOverride?: string;
    tableNameOverride?: string;
    isShareableConnection?: string;
    runtimePolicyName?: string;
    runtimeUrl?: string;
}
/**
 * Interface for table schema information
 */
export interface ITableSchema {
    name: string;
    displayName?: string;
    fields: Record<string, IFieldSchema>;
}
/**
 * Interface for field schema information
 */
export interface IFieldSchema {
    name: string;
    type: string;
    required?: boolean;
    maxLength?: number;
    defaultValue?: unknown;
}
/**
 * Dataverse custom action/function invocation request
 */
export type DataverseCustomApiRequest = {
    action: 'customapi';
    parameters: {
        /** Schema name of the action or function to invoke */
        operationName: string;
        /** Logical name of the data source (used to resolve the environment) */
        tableName: string;
        /** Input parameters passed as the request body */
        body?: unknown;
    };
};
/**
 * Interface for Dataverse-specific requests
 */
export type IDataverseRequest = DataverseMetadataRequest | DataverseCustomApiRequest;
/**
 * Supported data source types in the PowerDataRuntime
 */
export declare enum DataSources {
    /** Dataverse data source */
    Dataverse = "Dataverse",
    /** Generic connector data source */
    Connector = "Connector"
}
/**
 * Interface for metadata operations
 */
export interface IMetadataOperations {
    /**
     * Gets available connections
     */
    getConnections(context?: IOperationContext): Promise<IOperationResult<IConnectionReference[]>>;
    /**
     * Gets APIs available for a connection
     */
    getConnectionApis(connectionId: string, context?: IOperationContext): Promise<IOperationResult<IConnectionApi[]>>;
}
/**
 * Interface for runtime client provider
 */
export interface IRuntimeClientProvider {
    getDataClientAsync(config?: IClientConfig): Promise<IRuntimeDataClient>;
    getMetadataClientAsync(config?: IClientConfig): Promise<IRuntimeMetadataClient>;
}
/**
 * Interface for runtime data client
 */
export interface IRuntimeDataClient {
    createDataAsync<TRequest, TResponse>(url: string, connectionApi: string, serviceNamespace: string, body: TRequest, context?: IOperationContext): Promise<IOperationResult<TResponse>>;
    updateDataAsync<TRequest, TResponse>(url: string, connectionApi: string, serviceNamespace: string, body: TRequest, context?: IOperationContext): Promise<IOperationResult<TResponse>>;
    uploadDataAsync<TRequest extends string | Uint8Array | ArrayBuffer | Blob>(url: string, connectionApi: string, serviceNamespace: string, body: TRequest, context?: IOperationContext): Promise<IOperationResult<void>>;
    deleteDataAsync(url: string, connectionApi: string, serviceNamespace: string, context?: IOperationContext): Promise<IOperationResult<void>>;
    retrieveDataAsync<TResponse>(url: string, connectionApi: string, serviceNamespace: string, method: HttpMethod, headers?: {
        [key: string]: string;
    }, body?: unknown, context?: IOperationContext): Promise<IOperationResult<TResponse>>;
}
/**
 * Interface for runtime metadata client
 */
export interface IRuntimeMetadataClient {
    getAppConnectionConfigsAsync(context?: IOperationContext): Promise<IOperationResult<IConnectionReference>>;
    getAppDataSourceConfigsAsync(context?: IOperationContext): Promise<IOperationResult<IConnectionApi>>;
}
/**
 * Interface for PowerDataSourcesInfoProvider
 */
export interface IPowerDataSourcesInfoProvider {
    getDataSourcesInfo(): Promise<DataSourcesInfo>;
}
//# sourceMappingURL=types.d.ts.map