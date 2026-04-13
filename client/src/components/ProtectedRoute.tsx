import { useSession } from "@/lib/auth-client";
import { Redirect } from "@/lib/wouter-stub";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#991b1b] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/login" />;
  }

  if (requiredRole && (session.user as any)?.role !== requiredRole) {
    // Auto-redirect to the correct page instead of showing Access Denied
    const userRole = (session.user as any)?.role;
    if (userRole === "bodhi_admin") return <Redirect to="/admin" />;
    if (userRole === "temple_admin") return <Redirect to="/dashboard" />;
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}


