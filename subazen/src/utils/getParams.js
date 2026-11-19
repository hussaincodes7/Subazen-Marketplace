const getParams = (search = "") =>
  Object.fromEntries(new URLSearchParams(search));

export default getParams;
