import { Suspense } from "react";
import { ResetPasswordForm } from "@/src/features/auth/components/ResetPasswordForm";

// useSearchParams() must be wrapped in a Suspense boundary for static export.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
