import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_ID!,           // ✅ Use nextjs-app client
      clientSecret: process.env.KEYCLOAK_SECRET!,   // ✅ Use nextjs-app secret
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true, // Allow localhost:5012 and other hosts
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // Simple role extraction
        let roles: string[] = [];
        
        if ((profile as any).realm_access?.roles) {
          roles = (profile as any).realm_access.roles;
        }
        
        token.roles = roles;
        // Add subject id
        token.sub = (profile as any).sub || token.sub;
        // Store the id_token for logout
        if (account.id_token) {
          token.idToken = account.id_token;
        }

      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        (session.user as any).roles = token.roles || [];
        (session as any).userId = token.sub;
        // Include id_token in session for logout
        (session as any).idToken = token.idToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signOut(message: any) {
      console.log('🚪 [NEXTAUTH] SignOut event triggered');
      // Clear any additional session data on logout
    },
  },
});
