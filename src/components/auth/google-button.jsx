export function GoogleButton({ next = "/d" }) {
  const href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  return (
    <a
      href={href}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-md bg-white text-sm font-semibold text-black"
    >
      <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        />
      </svg>
      Continue with Google
    </a>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-zinc-500">
      <span className="h-px flex-1 bg-white/10" />
      or
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

const GOOGLE_ERRORS = {
  google_denied: "Google sign-in was cancelled.",
  google_state: "That Google sign-in expired. Try again.",
  google_email: "Google did not confirm an email for that account.",
  google_linked: "That email is already linked to a different Google account.",
  google_config: "Google sign-in is not set up yet.",
  google_host: "Open the site on uplytics.space or localhost to use Google.",
};

export function googleErrorMessage(code) {
  return GOOGLE_ERRORS[code] || "";
}
