import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Admin sign in</h1>
      <LoginForm />
    </div>
  );
}