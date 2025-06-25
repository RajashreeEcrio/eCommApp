export const normalize = (uri) => {
  if (typeof uri !== "string") return "";

  return uri
    .trim()
    .replace(/^<?(sip:|tel:)/i, "") // Remove optional leading <sip: or <tel:
    .replace(/@.*$/, "") // Remove everything after @ (for sip URIs)
    .replace(/>$/, "") // Remove trailing >
    .trim();
};
