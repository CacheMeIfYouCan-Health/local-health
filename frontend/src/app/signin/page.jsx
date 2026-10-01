import { Suspense } from 'react';
import AuthForm from '@components/auth/AuthForm';

export default function SignupPage() {
  // AuthForm reads ?next= (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
