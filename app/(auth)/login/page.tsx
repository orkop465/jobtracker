import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginClientPage from "./login-client";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/app");
  return <LoginClientPage />;
}
