import { getCurrentPlayer } from "../players/getCurrentPlayer.js";

export const getSessionAccount = async ({
  pool,
  headers,
  cookieHeader,
  auth,
} = {}) => {
  const currentPlayer = await getCurrentPlayer({
    pool,
    headers,
    cookieHeader,
    auth,
  });

  if (!currentPlayer?.account) {
    return null;
  }

  return {
    account: currentPlayer.account,
    session: currentPlayer.session,
    user: currentPlayer.user,
  };
};
