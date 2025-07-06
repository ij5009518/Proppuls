// Database retry utility to handle Neon control plane failures
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error (Neon control plane issues)
      const isRetryable = error.message?.includes('Control plane') ||
                          error.message?.includes('timeout') ||
                          error.message?.includes('connection') ||
                          error.code === 'ECONNRESET';
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export function isRetryableError(error: any): boolean {
  return error.message?.includes('Control plane') ||
         error.message?.includes('timeout') ||
         error.message?.includes('connection') ||
         error.code === 'ECONNRESET';
}