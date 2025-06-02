export const normalize = (uri) => {
  if (typeof uri !== 'string') return '';
  return uri.replace(/^sip:/, '').replace(/@.*$/, '').trim();
};
