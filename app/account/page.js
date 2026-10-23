import { AccountPageClient } from "../_features/account/AccountPageClient";

export const metadata = { title: "Account" };

export default function AccountPage({ searchParams }) {
  void searchParams;
  return <AccountPageClient />;
}
