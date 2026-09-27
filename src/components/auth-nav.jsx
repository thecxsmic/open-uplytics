import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthNav({ isAuthenticated = false }) {
  return (
    <div className="flex items-center gap-3">
      {isAuthenticated ? (
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/d">Dashboard</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/account">Account</Link>
          </Button>
        </>
      ) : (
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Start free</Link>
          </Button>
        </>
      )}
    </div>
  );
}
