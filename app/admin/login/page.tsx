import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";
import { getLanguage } from "@/lib/language-server";
import { getTranslation } from "@/lib/translations";

export default async function LoginPage() {
  const isAuthenticated = await getSession();
  if (isAuthenticated) {
    redirect("/");
  }

  const language = await getLanguage();

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        {getTranslation(language, "adminSignIn")}
      </h1>
      <LoginForm />
    </div>
  );
}