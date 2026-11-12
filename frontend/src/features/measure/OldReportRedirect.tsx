import { Navigate, useLocation } from 'react-router';
import { redirectOf } from './redirects';

export function OldReportRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate replace to={redirectOf(pathname, search)} />;
}
