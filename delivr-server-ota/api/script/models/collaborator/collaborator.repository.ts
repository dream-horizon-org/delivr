/**
 * Collaborator Repository
 * Data access layer for collaborators (app-level access)
 * Updated: Uses appId instead of appId
 */

import type { Sequelize } from 'sequelize';
import type { CollaboratorProperties } from '~storage/storage';

export interface CollaboratorAttributes {
  email: string;
  accountId: string;
  appId: string | null;
  permission: 'Owner' | 'Editor' | 'Viewer' | null;
  isCreator: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollaboratorRequest {
  email: string;
  accountId: string;
  appId: string;
  permission: 'Owner' | 'Editor' | 'Viewer';
  isCreator?: boolean;
}

export interface UpdateCollaboratorRequest {
  permission?: 'Owner' | 'Editor' | 'Viewer';
}

export class CollaboratorRepository {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly modelName: string = 'collaborator'
  ) {}

  private getModel() {
    return this.sequelize.models[this.modelName];
  }

  private toPlainObject = (instance: any): CollaboratorAttributes => {
    const json = instance.toJSON();
    return {
      email: json.email,
      accountId: json.accountId,
      appId: json.appId,
      permission: json.permission,
      isCreator: json.isCreator,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt
    };
  };

  create = async (
    data: CreateCollaboratorRequest
  ): Promise<CollaboratorAttributes> => {
    const collaborator = await this.getModel().create({
      email: data.email,
      accountId: data.accountId,
      appId: data.appId,
      permission: data.permission,
      isCreator: data.isCreator ?? false
    });

    return this.toPlainObject(collaborator);
  };

  findByAppId = async (appId: string): Promise<CollaboratorAttributes[]> => {
    const collaborators = await this.getModel().findAll({
      where: { appId },
      order: [['createdAt', 'ASC']]
    });

    return collaborators.map((collab) => this.toPlainObject(collab));
  };

  findByAccountId = async (accountId: string): Promise<CollaboratorAttributes[]> => {
    const collaborators = await this.getModel().findAll({
      where: { accountId },
      order: [['createdAt', 'ASC']]
    });

    return collaborators.map((collab) => this.toPlainObject(collab));
  };

  findByAppIdAndEmail = async (
    appId: string,
    email: string
  ): Promise<CollaboratorAttributes | null> => {
    const collaborator = await this.getModel().findOne({
      where: { appId, email }
    });

    if (!collaborator) {
      return null;
    }

    return this.toPlainObject(collaborator);
  };

  findByAccountIdAndAppId = async (
    accountId: string,
    appId: string
  ): Promise<CollaboratorAttributes | null> => {
    const collaborator = await this.getModel().findOne({
      where: { accountId, appId }
    });

    if (!collaborator) {
      return null;
    }

    return this.toPlainObject(collaborator);
  };

  update = async (
    appId: string,
    email: string,
    data: UpdateCollaboratorRequest
  ): Promise<CollaboratorAttributes | null> => {
    const collaborator = await this.getModel().findOne({
      where: { appId, email }
    });

    if (!collaborator) {
      return null;
    }

    await collaborator.update({
      permission: data.permission ?? undefined
    });

    return this.toPlainObject(collaborator);
  };

  delete = async (appId: string, email: string): Promise<boolean> => {
    const rowsDeleted = await this.getModel().destroy({
      where: { appId, email }
    });

    return rowsDeleted > 0;
  };

  deleteByAppId = async (appId: string): Promise<number> => {
    const rowsDeleted = await this.getModel().destroy({
      where: { appId }
    });

    return rowsDeleted;
  };

  /**
   * Get collaborators as a map (email -> CollaboratorProperties)
   * This matches the storage interface format
   */
  getCollaboratorMap = async (appId: string): Promise<Record<string, CollaboratorProperties>> => {
    const collaborators = await this.findByAppId(appId);
    
    const map: Record<string, CollaboratorProperties> = {};
    for (const collab of collaborators) {
      map[collab.email] = {
        accountId: collab.accountId,
        permission: collab.permission ?? undefined
      };
    }

    return map;
  };
}
