import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { checkCanSignUp, finishNewAccount } from "@/lib/accounts";

// Set by the sign-up page before a Google sign-in, so a brand-new Google
// account can be matched to the invite it was created from.
export const INVITE_COOKIE = "signup_invite";

export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

async function inviteFromCookie() {
  return (await cookies()).get(INVITE_COOKIE)?.value ?? null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Linking by email is safe because Google only reports verified addresses
    // (checked in the signIn callback), so the Google user owns that inbox.
    ...(googleEnabled ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email?.toLowerCase();
      if (profile?.email_verified !== true || !email) return false;

      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) return true;

      const decision = await checkCanSignUp(await inviteFromCookie());
      return decision.ok ? true : "/login?error=SignupNotAllowed";
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id && user.email) {
        await finishNewAccount(user.id, user.email, await inviteFromCookie());
      }
    },
  },
});
