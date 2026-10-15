import { Outlet } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard';

export function AuthPage() {
  return (
    <>
      <AuthCard />
      <Outlet />
    </>
  );
}

export default AuthPage;
