import NextAuth from "next-auth";
import Passkey from "next-auth/providers/passkey";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// No module-eval throw: every check below compares against ALLOWED_EMAIL, so
// a missing value fails closed (nobody can sign in) while letting builds and
// Vercel previews run without env vars.
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL?.toLowerCase();

const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  experimental: { enableWebAuthn: true },
  providers: [
    Passkey({
      // Only ever let the one allowed email register/authenticate a passkey —
      // this app is deployed publicly, so without this anyone could self-register.
      getUserInfo: async (options, request) => {
        const { adapter } = options;
        const { query, body, method } = request;
        const rawEmail = method === "POST" ? body?.email : query?.email;
        const email =
          typeof rawEmail === "string" ? rawEmail.toLowerCase() : undefined;

        if (!email || email !== ALLOWED_EMAIL || !adapter?.getUserByEmail) {
          return null;
        }

        const existingUser = await adapter.getUserByEmail(email);
        if (existingUser) return { user: existingUser, exists: true };
        return { user: { email }, exists: false };
      },
    }),
    Credentials({
      // Fallback for devices/browsers without an enrolled passkey. Also
      // locked to the single allowed email, same as Passkey above.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase()
            : undefined;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : undefined;

        if (!email || email !== ALLOWED_EMAIL || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
    // Safe to link by email: the signIn callback below only admits a Google
    // account whose verified email is the single allowed address.
    ...(googleEnabled ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        return (
          Boolean(ALLOWED_EMAIL) &&
          profile?.email_verified === true &&
          profile.email?.toLowerCase() === ALLOWED_EMAIL
        );
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      // Also fail closed for sessions issued before ALLOWED_EMAIL went
      // missing: without this check an existing JWT keeps working.
      if (token.email && token.email.toLowerCase() !== ALLOWED_EMAIL) {
        delete token.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
