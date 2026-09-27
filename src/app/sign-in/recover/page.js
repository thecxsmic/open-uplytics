import { Suspense } from "react";
import { RecoverForm } from "@/components/auth/recover-form";

export const metadata = {
  title: "Get back in",
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <Suspense>
      <RecoverForm />
    </Suspense>
  );
}
