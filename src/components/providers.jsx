"use client";

import { Toaster } from "sonner";

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        offset={{ top: 16 }}
        mobileOffset={{ top: 12 }}
        toastOptions={{
          style: {
            background: "rgba(28,28,30,0.94)",
            border: "none",
            borderRadius: 16,
            color: "#fff",
          },
        }}
      />
    </>
  );
}
