import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      roles?: string[]
    }
    id_token?: string
    userId?: string
  }

  interface User {
    roles?: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[]
    id_token?: string
    sub?: string
  }
} 