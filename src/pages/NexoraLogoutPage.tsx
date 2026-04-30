import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "@/lib/nexora-auth";
import PageLoader from "@/components/PageLoader";

export default function NexoraLogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      await logoutUser();
      setTimeout(() => navigate("/login", { replace: true }), 900);
    };
    run();
  }, []);

  return (
    <PageLoader duration={900}>
      <></>
    </PageLoader>
  );
}
