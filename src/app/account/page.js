"use client";

import { DashboardShell } from "@/components/dashboard/shell";
import { AccountForm } from "@/components/account/account-form";
import { Screen } from "@/components/dashboard/ios";

export default function AccountPage() {
  return (
    <DashboardShell>
      <Screen title="Account" subtitle="Your name, password, and sign-in.">
        <AccountForm showBack />
      </Screen>
    </DashboardShell>
  );
}
