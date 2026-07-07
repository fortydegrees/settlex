import { headers } from "next/headers";
import { getSessionAccount } from "../lib/server/accounts/getSessionAccount.js";
import { HomeTableClient } from "./catana/home/HomeTableClient";

async function getInitialHomeAccount() {
  try {
    const sessionAccount = await getSessionAccount({
      headers: headers()
    });

    return sessionAccount?.account ?? null;
  } catch (err) {
    return null;
  }
}

export default async function Home() {
  const initialAccount = await getInitialHomeAccount();

  return <HomeTableClient initialAccount={initialAccount} />;
}
