import { AccountPageClient } from "./AccountPageClient";

const getSingleSearchParam = (value) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const decodeClaimError = (value) => {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

export default function AccountPage({ searchParams }) {
  const claimed = getSingleSearchParam(searchParams?.claimed);
  const claimError = getSingleSearchParam(searchParams?.claimError);
  const claimedMessage =
    claimed === "1"
      ? "Account claimed successfully."
      : decodeClaimError(claimError);

  return <AccountPageClient claimedMessage={claimedMessage} />;
}
