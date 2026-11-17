/**
 * Base custom error for Search Cluster operations
 */
export class SearchClusterError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'SearchClusterError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 404 - Requested cluster instance is not defined in configuration
 */
export class InstanceNotFoundError extends SearchClusterError {
  constructor(instanceName: string) {
    super(`Search cluster instance '${instanceName}' was not found in Backstage configuration.`, 404);
    this.name = 'InstanceNotFoundError';
  }
}

/**
 * 401 / 403 - Authentication or authorization error against the search cluster
 */
export class ClusterAuthenticationError extends SearchClusterError {
  constructor(instanceName: string, detail?: string) {
    super(
      `Authentication failed for search cluster instance '${instanceName}'. Please verify cluster credentials.${detail ? ` (${detail})` : ''}`,
      401,
    );
    this.name = 'ClusterAuthenticationError';
  }
}

/**
 * 502 - Upstream cluster is unreachable, TLS error, or request timed out
 */
export class UpstreamClusterError extends SearchClusterError {
  constructor(instanceName: string, reason: string) {
    super(`Upstream search cluster '${instanceName}' error: ${reason}`, 502);
    this.name = 'UpstreamClusterError';
  }
}

/**
 * 400 - Validation error for query parameters or configuration
 */
export class ValidationError extends SearchClusterError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
