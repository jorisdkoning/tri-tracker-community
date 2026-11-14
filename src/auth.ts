import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { checkCanSignUp, claimInvite, finishNewAccount } from "@/lib/accounts";

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
    // No automatic linking to an existing email/password account: that account
    // may have been registered by someone else with this (unverified) address.
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email?.toLowerCase();
      if (profile?.email_verified !== true || !email) return false;

      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) return true;

      const invite = await inviteFromCookie();
      const decision = await checkCanSignUp(invite);
      if (!decision.ok) return "/login?error=SignupNotAllowed";
      if (decision.inviteRequired && !(await claimInvite(invite, email))) {
        return "/login?error=SignupNotAllowed";
      }
      return true;
    },
    async jwt({ token, user }) {
      const id = (user?.id ?? token.id) as string | undefined;
      if (!id) return token;
      const row = await prisma.user.findUnique({ where: { id }, select: { sessionVersion: true } });
      if (!row) return null;
      if (user) {
        token.id = id;
        token.sv = row.sessionVersion;
      } else if (token.sv !== row.sessionVersion) {
        return null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await finishNewAccount(user.id);
      }
    },
  },
});
