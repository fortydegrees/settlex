import { lookup as dnsLookup } from "node:dns";
import https from "node:https";
import { BlockList, isIP } from "node:net";

const blockedAddresses = new BlockList();

[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].forEach(([address, prefix]) =>
  blockedAddresses.addSubnet(address, prefix, "ipv4")
);

blockedAddresses.addAddress("::", "ipv6");
blockedAddresses.addAddress("::1", "ipv6");
[
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
].forEach(([address, prefix]) =>
  blockedAddresses.addSubnet(address, prefix, "ipv6")
);

const bareHostname = (hostname = "") =>
  hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

export function isPrivateOrReservedAddress(address) {
  const candidate = bareHostname(String(address ?? "").trim());
  const family = isIP(candidate);
  if (family === 4) return blockedAddresses.check(candidate, "ipv4");
  if (family === 6) return blockedAddresses.check(candidate, "ipv6");
  return false;
}

export function isSafePushEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const hostname = bareHostname(url.hostname).toLowerCase();
    if (url.protocol !== "https:") return false;
    if (url.username || url.password || url.hash) return false;
    if (url.port && url.port !== "443") return false;
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
      return false;
    }
    return !isPrivateOrReservedAddress(hostname);
  } catch {
    return false;
  }
}

const privateEndpointError = (hostname) => {
  const error = new Error(`Push endpoint ${hostname} resolved to a private address.`);
  error.code = "ERR_PRIVATE_PUSH_ENDPOINT";
  return error;
};

export function createSafePushAgent({ dnsLookupImpl = dnsLookup } = {}) {
  const safeLookup = (hostname, options, callback) => {
    const requestedOptions =
      typeof options === "object" && options !== null
        ? options
        : { family: options || 0 };

    dnsLookupImpl(
      hostname,
      { ...requestedOptions, all: true },
      (error, resolved) => {
        if (error) {
          callback(error);
          return;
        }

        const addresses = Array.isArray(resolved)
          ? resolved
          : resolved
            ? [resolved]
            : [];
        if (
          addresses.length === 0 ||
          addresses.some(({ address }) => isPrivateOrReservedAddress(address))
        ) {
          callback(privateEndpointError(hostname));
          return;
        }

        if (requestedOptions.all) {
          callback(null, addresses);
          return;
        }
        callback(null, addresses[0].address, addresses[0].family);
      }
    );
  };

  return new https.Agent({
    keepAlive: true,
    maxSockets: 4,
    lookup: safeLookup,
  });
}
