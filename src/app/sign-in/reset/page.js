import { Suspense } from "react";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
