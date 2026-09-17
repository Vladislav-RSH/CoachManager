export const getClientInviteToken = (pathname: string, search: string) => {
  const searchToken = new URLSearchParams(search).get("invite");

  if (searchToken) {
    return searchToken;
  }

  const pathMatch = pathname.match(/^\/invite\/([^/?#]+)/);

  return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
};

export const createClientInviteLink = (token: string) =>
  `${window.location.origin}/invite/${encodeURIComponent(token)}`;
