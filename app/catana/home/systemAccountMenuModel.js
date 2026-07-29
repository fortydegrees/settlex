import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const SYSTEM_ACCOUNT_MENU_ITEMS = [
  {
    label: "Account",
    icon: UserCircleIcon,
    action: "account",
  },
  {
    label: "Preferences",
    icon: Cog6ToothIcon,
    action: "identity",
  },
  {
    label: "Sign out",
    icon: ArrowRightOnRectangleIcon,
    action: "signOut",
  },
];

export const getSystemAccountMenuItems = (accountStatus) =>
  accountStatus !== "claimed"
    ? [
        {
          label: "Save profile",
          icon: UserCircleIcon,
          action: "saveProfile",
        },
        {
          label: "Edit profile",
          icon: PencilSquareIcon,
          action: "identity",
        },
        {
          label: "Sign out",
          icon: ArrowRightOnRectangleIcon,
          action: "signOut",
        },
      ]
    : SYSTEM_ACCOUNT_MENU_ITEMS;
