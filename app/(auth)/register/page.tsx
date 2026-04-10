import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RegisterClient from "./register-client";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/app");
  return <RegisterClient />;
}
