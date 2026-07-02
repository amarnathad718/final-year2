"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/nav";

export function NavShell() {
  const pathname = usePathname();

  if (pathname === "/signin") {
    return null;
  }

  return <AppNav />;
}
