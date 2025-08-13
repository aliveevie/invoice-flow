export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function toBytes32Address(address) {
  if (!address) throw new Error("address is required");
  const hex = address.toLowerCase().startsWith("0x") ? address.slice(2) : address;
  if (hex.length !== 40) throw new Error("address must be 20 bytes (40 hex chars)");
  return `0x${"0".repeat(24)}${hex}`;
}


