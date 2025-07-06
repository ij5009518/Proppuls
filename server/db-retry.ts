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
      const isRetryable = 
        error.message?.includes('Control plane') ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT';
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`Database operation failed permanently after ${attempt} attempts:`, {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        throw error;
      }
      
      console.log(`Database operation failed, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Exponential backoff with jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const delay = delayMs * Math.pow(2, attempt - 1) + jitter;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export function isRetryableError(error: any): boolean {
  return error.message?.includes('Control plane') ||
         error.message?.includes('timeout') ||
         error.message?.includes('connection') ||
         error.message?.includes('Failed to fetch') ||
         error.message?.includes('network') ||
         error.code === 'ECONNRESET' ||
         error.code === 'ENOTFOUND' ||
         error.code === 'ETIMEDOUT';
}