import { supabase } from './supabase';
import { ActionTypes } from '../types/actionTypes';

/**
 * Logger - Helper class for logging user actions to the action_logs table
 * 
 * All methods are non-blocking - if logging fails, it won't break the application.
 * All methods automatically enrich metadata with IP address when available.
 */
export class Logger {
  /**
   * Log authentication-related actions
   */
  static async logAuth(
    actionType: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const enrichedMetadata = await this._enrichMetadata(metadata);
      await this._log(actionType, description, {
        metadata: enrichedMetadata,
        performerType: 'user',
      });
    } catch (error) {
      console.error('Failed to log auth action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Log document-related actions
   */
  static async logDocument(
    actionType: string,
    docId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const enrichedMetadata = await this._enrichMetadata(metadata);
      await this._log(actionType, description, {
        entityType: 'document',
        entityId: docId,
        metadata: enrichedMetadata,
        performerType: 'user',
      });
    } catch (error) {
      console.error('Failed to log document action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Log payment-related actions
   */
  static async logPayment(
    actionType: string,
    paymentId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const enrichedMetadata = await this._enrichMetadata(metadata);
      await this._log(actionType, description, {
        entityType: 'payment',
        entityId: paymentId,
        metadata: enrichedMetadata,
        performerType: 'user',
      });
    } catch (error) {
      console.error('Failed to log payment action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Log admin actions (actions performed by admins on other users/entities)
   */
  static async logAdminAction(
    actionType: string,
    targetUserId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const enrichedMetadata = await this._enrichMetadata(metadata);
      await this._log(actionType, description, {
        affectedUserId: targetUserId,
        metadata: enrichedMetadata,
        performerType: 'admin',
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Log system actions (automated actions, emails, notifications, etc.)
   */
  static async logSystem(
    actionType: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const enrichedMetadata = await this._enrichMetadata(metadata);
      await this._log(actionType, description, {
        metadata: enrichedMetadata,
        performerType: 'system',
      });
    } catch (error) {
      console.error('Failed to log system action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Generic log method - use when you need more control
   */
  static async log(
    actionType: string,
    description: string,
    options?: {
      entityType?: string;
      entityId?: string;
      affectedUserId?: string;
      performerType?: 'user' | 'admin' | 'authenticator' | 'finance' | 'affiliate' | 'system';
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const enrichedMetadata = options?.metadata
        ? await this._enrichMetadata(options.metadata)
        : await this._enrichMetadata({});

      await this._log(actionType, description, {
        entityType: options?.entityType,
        entityId: options?.entityId,
        affectedUserId: options?.affectedUserId,
        performerType: options?.performerType || 'user',
        metadata: enrichedMetadata,
      });
    } catch (error) {
      console.error('Failed to log action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Internal method to call the SQL function
   */
  private static async _log(
    actionType: string,
    description: string,
    options: {
      entityType?: string;
      entityId?: string;
      affectedUserId?: string;
      performerType?: 'user' | 'admin' | 'authenticator' | 'finance' | 'affiliate' | 'system';
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const { data, error } = await supabase.rpc('log_action', {
      p_action_type: actionType,
      p_action_description: description,
      p_entity_type: options.entityType || null,
      p_entity_id: options.entityId || null,
      p_metadata: options.metadata || null,
      p_affected_user_id: options.affectedUserId || null,
      p_performed_by_type: options.performerType || 'user',
    });

    if (error) {
      console.error('Error calling log_action:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Enrich metadata with IP address when available
   * Uses ipify.org API with 2 second timeout
   */
  private static async _enrichMetadata(
    metadata?: Record<string, any>
  ): Promise<Record<string, any>> {
    const base = metadata || {};

    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        return { ...base, ip: data?.ip };
      }
    } catch (err) {
      // Silent fail - IP enrichment is optional
    }

    return base;
  }
}

