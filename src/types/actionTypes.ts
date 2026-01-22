/**
 * Action Types - Standardized action type constants for the Action Logs system
 * 
 * These constants are used throughout the application to ensure consistency
 * in logging and make it easier to filter and analyze logs.
 */

export const ActionTypes = {
  AUTH: {
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    USER_REGISTER: 'user_register',
    PASSWORD_RESET: 'password_reset',
    PASSWORD_RESET_REQUEST: 'password_reset_request',
    LOGIN_FAILED: 'login_failed',
  },
  DOCUMENT: {
    UPLOAD: 'document_upload',
    UPLOADED: 'DOCUMENT_UPLOADED',
    UPLOAD_FAILED: 'DOCUMENT_UPLOAD_FAILED',
    RETRY_UPLOAD: 'document_retry_upload',
    APPROVE: 'document_approve',
    APPROVED: 'DOCUMENT_APPROVED',
    REJECT: 'document_reject',
    REJECTED: 'DOCUMENT_REJECTED',
    DELETE: 'document_delete',
    UPDATE: 'document_update',
    DOWNLOAD: 'document_download',
    VIEW: 'document_view',
    CORRECTION_UPLOADED: 'document_correction_uploaded',
    STATUS_CHANGED: 'document_status_changed',
    MANUAL_UPLOAD_BY_AUTHENTICATOR: 'document_manual_upload_by_authenticator',
  },
  PAYMENT: {
    CREATED: 'payment_created',
    COMPLETED: 'payment_completed',
    CANCELLED: 'payment_cancelled',
    REFUNDED: 'payment_refunded',
    FAILED: 'payment_failed',
    STRIPE_COMPLETED: 'stripe_payment_completed',
    ZELLE_CREATED: 'zelle_payment_created',
    ZELLE_VERIFIED: 'zelle_payment_verified',
    ZELLE_APPROVED: 'zelle_payment_approved',
    ZELLE_REJECTED: 'zelle_payment_rejected',
    PENDING: 'payment_pending',
  },
  ADMIN: {
    USER_ROLE_CHANGED: 'user_role_changed',
    USER_PROFILE_UPDATED: 'user_profile_updated',
    USER_DELETED: 'user_deleted',
    DOCUMENT_INFO_EDITED: 'document_info_edited',
    PAYMENT_MANUAL_UPDATE: 'payment_manual_update',
  },
  SYSTEM: {
    EMAIL_SENT: 'email_sent',
    NOTIFICATION_SENT: 'notification_sent',
    REPORT_GENERATED: 'report_generated',
    CRON_JOB_EXECUTED: 'cron_job_executed',
  },
  ERROR: {
    AUTHENTICATION_ERROR: 'authentication_error',
    DOWNLOAD_ERROR: 'download_error',
    VIEW_ERROR: 'view_error',
    UPLOAD_ERROR: 'upload_error',
    PAYMENT_ERROR: 'payment_error',
    GENERAL_ERROR: 'general_error',
  },
} as const;

/**
 * Action Type Labels - Human-readable labels for action types
 * Used in the UI to display user-friendly action names
 */
export const ActionTypeLabels: Record<string, string> = {
  // Auth
  [ActionTypes.AUTH.USER_LOGIN]: 'User Login',
  [ActionTypes.AUTH.USER_LOGOUT]: 'User Logout',
  [ActionTypes.AUTH.USER_REGISTER]: 'User Registration',
  [ActionTypes.AUTH.PASSWORD_RESET]: 'Password Reset',
  [ActionTypes.AUTH.PASSWORD_RESET_REQUEST]: 'Password Reset Request',
  [ActionTypes.AUTH.LOGIN_FAILED]: 'Login Failed',
  
  // Document
  [ActionTypes.DOCUMENT.UPLOAD]: 'Document Upload',
  [ActionTypes.DOCUMENT.UPLOADED]: 'Document Uploaded',
  [ActionTypes.DOCUMENT.UPLOAD_FAILED]: 'Document Upload Failed',
  [ActionTypes.DOCUMENT.RETRY_UPLOAD]: 'Document Retry Upload',
  [ActionTypes.DOCUMENT.APPROVE]: 'Document Approval',
  [ActionTypes.DOCUMENT.APPROVED]: 'Document Approved',
  [ActionTypes.DOCUMENT.REJECT]: 'Document Rejection',
  [ActionTypes.DOCUMENT.REJECTED]: 'Document Rejected',
  [ActionTypes.DOCUMENT.DELETE]: 'Document Deleted',
  [ActionTypes.DOCUMENT.UPDATE]: 'Document Updated',
  [ActionTypes.DOCUMENT.DOWNLOAD]: 'Document Downloaded',
  [ActionTypes.DOCUMENT.VIEW]: 'Document Viewed',
  [ActionTypes.DOCUMENT.CORRECTION_UPLOADED]: 'Document Correction Uploaded',
  [ActionTypes.DOCUMENT.STATUS_CHANGED]: 'Document Status Changed',
  [ActionTypes.DOCUMENT.MANUAL_UPLOAD_BY_AUTHENTICATOR]: 'Manual Upload by Authenticator',
  
  // Payment
  [ActionTypes.PAYMENT.CREATED]: 'Payment Created',
  [ActionTypes.PAYMENT.COMPLETED]: 'Payment Completed',
  [ActionTypes.PAYMENT.CANCELLED]: 'Payment Cancelled',
  [ActionTypes.PAYMENT.REFUNDED]: 'Payment Refunded',
  [ActionTypes.PAYMENT.FAILED]: 'Payment Failed',
  [ActionTypes.PAYMENT.STRIPE_COMPLETED]: 'Stripe Payment Completed',
  [ActionTypes.PAYMENT.ZELLE_CREATED]: 'Zelle Payment Created',
  [ActionTypes.PAYMENT.ZELLE_VERIFIED]: 'Zelle Payment Verified',
  [ActionTypes.PAYMENT.ZELLE_APPROVED]: 'Zelle Payment Approved',
  [ActionTypes.PAYMENT.ZELLE_REJECTED]: 'Zelle Payment Rejected',
  [ActionTypes.PAYMENT.PENDING]: 'Payment Pending',
  
  // Admin
  [ActionTypes.ADMIN.USER_ROLE_CHANGED]: 'User Role Changed',
  [ActionTypes.ADMIN.USER_PROFILE_UPDATED]: 'User Profile Updated',
  [ActionTypes.ADMIN.USER_DELETED]: 'User Deleted',
  [ActionTypes.ADMIN.DOCUMENT_INFO_EDITED]: 'Document Info Edited',
  [ActionTypes.ADMIN.PAYMENT_MANUAL_UPDATE]: 'Payment Manually Updated',
  
  // System
  [ActionTypes.SYSTEM.EMAIL_SENT]: 'Email Sent',
  [ActionTypes.SYSTEM.NOTIFICATION_SENT]: 'Notification Sent',
  [ActionTypes.SYSTEM.REPORT_GENERATED]: 'Report Generated',
  [ActionTypes.SYSTEM.CRON_JOB_EXECUTED]: 'Cron Job Executed',
  
  // Error
  [ActionTypes.ERROR.AUTHENTICATION_ERROR]: 'Authentication Error',
  [ActionTypes.ERROR.DOWNLOAD_ERROR]: 'Download Error',
  [ActionTypes.ERROR.VIEW_ERROR]: 'View Error',
  [ActionTypes.ERROR.UPLOAD_ERROR]: 'Upload Error',
  [ActionTypes.ERROR.PAYMENT_ERROR]: 'Payment Error',
  [ActionTypes.ERROR.GENERAL_ERROR]: 'General Error',
};

