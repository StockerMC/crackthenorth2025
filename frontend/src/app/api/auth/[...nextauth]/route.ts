import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { upsertCreatorTokens, createPartnership } from "@/lib/supabaseAdmin";
import { getChannelIdFromRequest } from "@/lib/channelStorage";

async function refreshAccessToken(token: JWT, req?: Request): Promise<JWT> {
    try {
        if (!token.refreshToken) {
            console.error("[Token Refresh] No refresh token available");
            throw new Error("No refresh token available");
        }

        console.log("[Token Refresh] Attempting with:", {
            clientId: process.env.GOOGLE_CLIENT_ID?.slice(0, 5) + "...",
            refreshToken: (token.refreshToken as string).slice(0, 5) + "..."
        });

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
            }),
        });

        const refreshedTokens = await response.json();
        if (!response.ok) {
            throw refreshedTokens;
        }

        // Get channelId from token or request cookies
        let channelId = token.channelId as string | undefined;
        if (!channelId && req) {
            channelId = getChannelIdFromRequest(req) || undefined;
        }

        if (channelId) {
            await upsertCreatorTokens({
                channelId,
                email: token.email as string,
                accessToken: refreshedTokens.access_token,
                refreshToken: token.refreshToken as string,
                expiresAt: new Date(Date.now() + refreshedTokens.expires_in * 1000),
            });
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
        };
    } catch (error) {
        console.error("[Token Refresh] Error:", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        } as JWT;
    }
}

// Constants for cookie settings
const COOKIES_LIFE_TIME = 24 * 60 * 60; // 24 hours in seconds
const COOKIE_PREFIX = process.env.NODE_ENV === 'production' ? '__Secure-' : '';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/youtube.force-ssl",
                    access_type: "offline",
                    response_type: "code",
                    prompt: "consent select_account",
                    include_granted_scopes: "true",
                },
            },
            client: {
                authorization_signed_response_alg: "RS256",
                id_token_signed_response_alg: "RS256",
            },
            checks: ["state", "pkce"],
        }),
    ],
    debug: true,
    callbacks: {
        async jwt({ token, user, account, trigger }) {
            console.log("[JWT Callback] account:", account ? "present" : "missing");
            console.log(user)
            console.log(account)

            // Initial sign in
            if (account && user) {
                console.log("[JWT Callback] Initial sign in:", {
                    hasAccess: !!account.access_token,
                    hasRefresh: !!account.refresh_token,
                });

                if (!account.access_token || !account.refresh_token) {
                    console.error("[JWT Callback] Missing tokens in account");
                    return { ...token, error: "MissingTokens" };
                }

                // Try to get channelId from state first, then from stored cookie
                let channelId: string | undefined;
                let companyId: string | undefined;
                let shortId: string | undefined;
                let shopName: string | undefined;
                
                // Try to get from state parameter
                try {
                    const stateParam = account.state as string;
                    if (stateParam) {
                        const stateData = JSON.parse(atob(stateParam));
                        channelId = stateData.channelId;
                        companyId = stateData.companyId;
                        shortId = stateData.shortId;
                        shopName = stateData.shop_name;
                        console.log("[JWT Callback] Decoded state data:", stateData);
                    }
                } catch (error) {
                    console.log("[JWT Callback] No state or error decoding state:", error);
                }

                // If no channelId from state, try to get from stored cookie/localStorage
                // This would be set by our /connect page
                if (!channelId) {
                    // This will need to be passed through the request context
                    console.log("[JWT Callback] No channelId in state, should be available from cookie");
                }

                // If shop_name is present, this is a company sign-in, skip creator logic
                if (shopName) {
                    console.log("[JWT Callback] Company sign-in detected, skipping creator token logic");
                    return {
                        ...token,
                        userType: 'company',
                        shopName,
                    } as JWT;
                }

                // For creator sign-in, channelId is required
                if (!channelId) {
                    console.error("[JWT Callback] No channelId available for creator sign-in");
                    // Don't throw error, let it proceed without creator-specific logic
                    return {
                        ...token,
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token,
                        expiresAt: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
                        userType: 'creator',
                    } as JWT;
                }

                // --- Token expiry ---
                const tokenExpiry = account.expires_at
                    ? account.expires_at * 1000
                    : Date.now() + 3600 * 1000;

                // --- Save to Supabase with the channelId ---
                const creatorData = await upsertCreatorTokens({
                    channelId,
                    email: user.email!,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: new Date(tokenExpiry),
                });

                let partnershipId: string | undefined;
                if (companyId && shortId && creatorData?.id) {
                    const partnership = await createPartnership({
                        creatorId: creatorData.id,
                        companyId,
                        shortId,
                    });
                    partnershipId = partnership.id;
                }

                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    channelId,
                    expiresAt: tokenExpiry,
                    partnershipId,
                    userType: 'creator',
                } as JWT;
            }

            // Skip refresh logic for companies
            if (token.userType === 'company') {
                return token;
            }

            // Refresh if expired
            if (token.expiresAt && Date.now() < token.expiresAt - 60000) {
                return token;
            }
            if (token.accessToken && token.refreshToken) {
                console.log("[JWT Callback] Access token expired, attempting refresh");
                return refreshAccessToken(token);
            }

            console.warn("[JWT Callback] Missing tokens, returning unchanged token");
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.userId as string;
                session.user.channelId = token.channelId as string;
                session.accessToken = token.accessToken as string;
                session.error = token.error;
                session.partnershipId = token.partnershipId as string | undefined;
                session.userType = token.userType as string;
                session.shopName = token.shopName as string | undefined;
            }
            return session;
        },
            async redirect({ url, baseUrl }) {
                const urlObj = new URL(url, baseUrl);
                const partnershipId = urlObj.searchParams.get('partnershipId');

                if (partnershipId) {
                    return `${baseUrl}/partnership-prompt?id=${partnershipId}`;
                }

                // Check if this is a company sign-in by looking at the URL state
                try {
                    const stateParam = urlObj.searchParams.get('state');
                    if (stateParam) {
                        const stateData = JSON.parse(atob(stateParam));
                        if (stateData.shop_name) {
                            return `${baseUrl}/stores`;
                        }
                        // If there's partnership data in state, check if partnership was created
                        if (stateData.channelId && stateData.companyId && stateData.shortId) {
                            // The JWT callback will create the partnership
                            // We need to get the partnership ID from the session/token somehow
                            // For now, we'll create a temporary solution by checking the database
                            // This is not ideal but works for the current flow
                            return `${baseUrl}/dashboard`;
                        }
                    }
                } catch (error) {
                    console.error("[Redirect Callback] Error parsing state:", error);
                }
    
                // For all other URLs, redirect to dashboard
                const finalUrl = `${baseUrl}/dashboard`;
                console.log("[Redirect Callback] Redirecting to dashboard:", finalUrl);
                return finalUrl;
            },
    },
    pages: {
        signIn: "/creators",
    },
    cookies: {
        sessionToken: {
            name: `${COOKIE_PREFIX}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        callbackUrl: {
            name: `${COOKIE_PREFIX}next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        csrfToken: {
            name: `${COOKIE_PREFIX}next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        pkceCodeVerifier: {
            name: `${COOKIE_PREFIX}next-auth.pkce.code_verifier`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: COOKIES_LIFE_TIME,
            },
        },
        state: {
            name: `${COOKIE_PREFIX}next-auth.state`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: COOKIES_LIFE_TIME, // Extended state cookie lifetime
            },
        },
        nonce: {
            name: `${COOKIE_PREFIX}next-auth.nonce`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
};

// Store request in a context that can be accessed by callbacks
let currentRequest: Request | null = null;

interface HandlerContext {
    params?: Record<string, string>;
    [key: string]: unknown;
}

interface JwtCallbackParams {
    token: JWT;
    user?: Record<string, unknown>;
    account?: Record<string, unknown>;
    trigger?: string;
}

const handler = async (req: Request, context: HandlerContext): Promise<Response> => {
    // Store the current request for access in callbacks
    currentRequest = req;
    
    // Get channelId from cookie for logging
    const cookieChannelId: string | undefined = getChannelIdFromRequest(req) ?? undefined;
    console.log("[NextAuth Handler] ChannelId from cookie:", cookieChannelId);
    
    return NextAuth({
        ...authOptions,
        callbacks: {
            ...authOptions.callbacks,
            async jwt({ token, user, account, trigger }: JwtCallbackParams): Promise<JWT> {
                console.log("[JWT Callback] account:", account ? "present" : "missing");
                
                // Initial sign in
                if (account && user) {
                    console.log("[JWT Callback] Initial sign in:", {
                        hasAccess: !!account.access_token,
                        hasRefresh: !!account.refresh_token,
                    });

                    if (!account.access_token || !account.refresh_token) {
                        console.error("[JWT Callback] Missing tokens in account");
                        return { ...token, error: "MissingTokens" };
                    }

                    // Try to get channelId from state first, then from stored cookie
                    let channelId: string | undefined;
                    let companyId: string | undefined;
                    let shortId: string | undefined;
                    let shopName: string | undefined;
                    
                    // Try to get from state parameter
                    try {
                        const stateParam: string = account.state as string;
                        if (stateParam) {
                            const stateData: {
                                channelId?: string;
                                companyId?: string;
                                shortId?: string;
                                shop_name?: string;
                            } = JSON.parse(atob(stateParam));
                            channelId = stateData.channelId;
                            companyId = stateData.companyId;
                            shortId = stateData.shortId;
                            shopName = stateData.shop_name;
                            console.log("[JWT Callback] Decoded state data:", stateData);
                        }
                    } catch (error) {
                        console.log("[JWT Callback] No state or error decoding state:", error);
                    }

                    // If no channelId from state, try to get from stored cookie
                    if (!channelId && currentRequest) {
                        channelId = getChannelIdFromRequest(currentRequest) || undefined;
                        console.log("[JWT Callback] Retrieved channelId from cookie:", channelId);
                    }

                    // If shop_name is present, this is a company sign-in, skip creator logic
                    if (shopName) {
                        console.log("[JWT Callback] Company sign-in detected, skipping creator token logic");
                        return {
                            ...token,
                            userType: 'company',
                            shopName,
                        } as JWT;
                    }

                    // For creator sign-in, channelId is required
                    if (!channelId) {
                        console.error("[JWT Callback] No channelId available for creator sign-in");
                        // Don't throw error, let it proceed without creator-specific logic
                        return {
                            ...token,
                            accessToken: account.access_token,
                            refreshToken: account.refresh_token,
                            expiresAt: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
                            userType: 'creator',
                        } as JWT;
                    }

                    // --- Token expiry ---
                    const tokenExpiry: number = account.expires_at
                        ? account.expires_at * 1000
                        : Date.now() + 3600 * 1000;

                    // --- Save to Supabase with the channelId ---
                    const creatorData: { id?: string } | null = await upsertCreatorTokens({
                        channelId,
                        email: user.email!,
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token,
                        expiresAt: new Date(tokenExpiry),
                    });

                    let partnershipId: string | undefined;
                    if (companyId && shortId && creatorData?.id) {
                        const partnership: { id: string } = await createPartnership({
                            creatorId: creatorData.id,
                            companyId,
                            shortId,
                        });
                        partnershipId = partnership.id;
                    }

                    return {
                        ...token,
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token,
                        channelId,
                        expiresAt: tokenExpiry,
                        partnershipId,
                        userType: 'creator',
                        userId: creatorData?.id,
                    } as JWT;
                }

                // Skip refresh logic for companies
                if (token.userType === 'company') {
                    return token;
                }

                // Refresh if expired
                if (token.expiresAt && Date.now() < token.expiresAt - 60000) {
                    return token;
                }
                if (token.accessToken && token.refreshToken) {
                    console.log("[JWT Callback] Access token expired, attempting refresh");
                    return refreshAccessToken(token, currentRequest || undefined);
                }

                console.warn("[JWT Callback] Missing tokens, returning unchanged token");
                return token;
            }
        }
    })(req, context);
};

export { handler as GET, handler as POST };