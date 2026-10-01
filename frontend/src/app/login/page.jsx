import { Suspense } from 'react';
import AuthForm from '@components/auth/AuthForm';

export default function LoginPage() {
  // AuthForm reads ?next= (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
