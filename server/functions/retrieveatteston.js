import axios from "axios";

export async function retrieveAttestation({
  transactionHash,
  // Provide either full `url` OR both `baseUrl` and `sourceDomain`
  url,
  baseUrl,
  sourceDomain,
  // polling controls
  intervalMs = 5000,
  timeoutMs,
  maxAttempts,
}) {
  if (!transactionHash) throw new Error("transactionHash is required");

  const resolvedUrl = url
    ? url
    : (() => {
        if (!baseUrl) throw new Error("baseUrl is required when url is not provided");
        if (sourceDomain === undefined || sourceDomain === null) {
          throw new Error("sourceDomain is required when url is not provided");
        }
        return `${baseUrl}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;
      })();

  const startTime = Date.now();
  let attempts = 0;

  while (true) {
    attempts += 1;
    try {
      const response = await axios.get(resolvedUrl);
      const status = response?.data?.messages?.[0]?.status;
      if (status === "complete") {
        return response.data.messages[0];
      }
    } catch (error) {
      // Swallow transient errors and keep polling, including 404
    }

    if (maxAttempts && attempts >= maxAttempts) {
      throw new Error("Attestation polling exceeded maxAttempts");
    }

    if (timeoutMs && Date.now() - startTime >= timeoutMs) {
      throw new Error("Attestation polling exceeded timeoutMs");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}


