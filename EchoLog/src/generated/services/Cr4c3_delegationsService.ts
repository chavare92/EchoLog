import type { Cr4c3_delegationsBase } from '../models/Cr4c3_delegationsModel';
import type { IGetOptions, IGetAllOptions } from '../models/CommonModels';
import type { IOperationResult } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../../.power/schemas/appschemas/dataSourcesInfo';
import { getClient } from '@microsoft/power-apps/data';

export class Cr4c3_delegationsService {
  private static readonly dataSourceName = 'cr4c3_delegations';
  private static readonly client = getClient(dataSourcesInfo);

  public static async create(
    record: Omit<Cr4c3_delegationsBase, 'cr4c3_delegationid'>
  ): Promise<IOperationResult<Cr4c3_delegationsBase>> {
    return Cr4c3_delegationsService.client.createRecordAsync<
      Omit<Cr4c3_delegationsBase, 'cr4c3_delegationid'>,
      Cr4c3_delegationsBase
    >(Cr4c3_delegationsService.dataSourceName, record);
  }

  public static async update(
    id: string,
    changedFields: Partial<Omit<Cr4c3_delegationsBase, 'cr4c3_delegationid'>>
  ): Promise<IOperationResult<Cr4c3_delegationsBase>> {
    return Cr4c3_delegationsService.client.updateRecordAsync<
      Partial<Omit<Cr4c3_delegationsBase, 'cr4c3_delegationid'>>,
      Cr4c3_delegationsBase
    >(Cr4c3_delegationsService.dataSourceName, id, changedFields);
  }

  public static async delete(id: string): Promise<IOperationResult<void>> {
    return Cr4c3_delegationsService.client.deleteRecordAsync(
      Cr4c3_delegationsService.dataSourceName,
      id
    );
  }

  public static async get(
    id: string,
    options?: IGetOptions
  ): Promise<IOperationResult<Cr4c3_delegationsBase>> {
    return Cr4c3_delegationsService.client.retrieveRecordAsync<Cr4c3_delegationsBase>(
      Cr4c3_delegationsService.dataSourceName,
      id,
      options
    );
  }

  public static async getAll(
    options?: IGetAllOptions
  ): Promise<IOperationResult<Cr4c3_delegationsBase[]>> {
    return Cr4c3_delegationsService.client.retrieveMultipleRecordsAsync<Cr4c3_delegationsBase>(
      Cr4c3_delegationsService.dataSourceName,
      options
    );
  }
}
