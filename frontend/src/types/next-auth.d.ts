import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    partnershipId?: string;
    userType?: string;
    shopName?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      channelId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    channelId?: string;
    expiresAt?: number;
    error?: string;
    partnershipId?: string;
    userType?: string;
    shopName?: string;
    userId?: string;
  }
}