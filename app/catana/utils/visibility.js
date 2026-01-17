export function isDocumentHidden() {
  if (typeof document === "undefined") return false;
  return Boolean(document.hidden);
}
