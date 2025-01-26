export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleRequestWithRetry(req, res, reqLogger) {
  let retryCount = 0;
  let currentDelay = RETRY_CONFIG.initialDelay;

  while (retryCount <= RETRY_CONFIG.maxRetries) {
    try {
      return await processRequest(req, res, reqLogger);
    } catch (error) {
      retryCount++;

      if (retryCount > RETRY_CONFIG.maxRetries) {
        reqLogger.error(
          {
            err: error,
            retriesExhausted: true,
          },
          "All retry attempts failed",
        );

        res.writeHead(500, { "content-type": "text/plain" });
        res.end("Internal Server Error - Retry attempts exhausted");
        return;
      }

      reqLogger.warn(
        {
          err: error,
          retryCount,
          nextRetryDelay: currentDelay,
        },
        "Request failed, attempting retry",
      );

      await delay(currentDelay);

      // Exponential backoff
      currentDelay = Math.min(
        currentDelay * RETRY_CONFIG.backoffMultiplier,
        RETRY_CONFIG.maxDelay,
      );
    }
  }
}
