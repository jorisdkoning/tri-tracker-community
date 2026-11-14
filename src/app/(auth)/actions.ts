"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { INVITE_COOKIE, signIn } from "@/auth";
import { createPasswordAccount } from "@/lib/accounts";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { MIN_PASSWORD_LENGTH, signupSchema } from "@/lib/signup-rules";

export type FormState = { error?: string } | undefined;

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };

  const inviteCode = String(formData.get("invite") ?? "") || null;
  const result = await createPasswordAccount({
    ...parsed.data,
    timezone: String(formData.get("timezone") ?? ""),
    inviteCode,
  });
  if (!result.ok) return { error: result.reason };

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/welcome",
  });
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    // signIn signals success by throwing a redirect, so only AuthError is a failure.
    if (error instanceof AuthError) return { error: "Wrong email or password. Please try again." };
    throw error;
  }
}

export async function googleAction(formData: FormData) {
  const invite = String(formData.get("invite") ?? "");
  if (invite) {
    (await cookies()).set(INVITE_COOKIE, invite, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60,
      path: "/",
    });
  }
  await signIn("google", { redirectTo: String(formData.get("redirectTo") ?? "/") });
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password` };
  }
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "The two passwords are not the same" };
  }
  const ok = await resetPasswordWithToken(String(formData.get("token") ?? ""), password);
  if (!ok) return { error: "This reset link has expired or was already used. Ask for a new one." };
  redirect("/login?reset=1");
}
