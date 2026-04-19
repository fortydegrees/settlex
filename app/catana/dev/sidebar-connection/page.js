import { notFound } from "next/navigation";
import { SidebarConnectionClient } from "./SidebarConnectionClient";

export default function SidebarConnectionPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <SidebarConnectionClient />;
}
