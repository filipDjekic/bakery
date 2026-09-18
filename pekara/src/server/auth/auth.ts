import 'server-only';

import { prismaAdapter } from '@better-auth/prisma-adapter';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth';

import { authPrisma } from './prisma.ts';
import { getTrustedApplicationOrigins } from './origin.ts';

function createAuthConfiguration(disableSignUp: boolean) {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is required in production.');
  }

  return betterAuth({
    appName: 'Pekara Admin',
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.APP_URL,
    trustedOrigins: [...getTrustedApplicationOrigins()],
    secret,
    database: prismaAdapter(authPrisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    user: {
      additionalFields: {
        role: {
          type: ['STAFF', 'ADMIN'],
          required: true,
          defaultValue: 'STAFF',
          input: false,
        },
        isActive: {
          type: 'boolean',
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await authPrisma.user.findUnique({
              where: { id: session.userId },
              select: { isActive: true },
            });

            if (!user?.isActive) {
              throw new APIError('UNAUTHORIZED', {
                message: 'Invalid email or password.',
              });
            }

            return { data: session };
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      window: 60,
      max: 30,
      customRules: {
        '/sign-in/email': {
          window: 60,
          max: 5,
        },
      },
    },
    advanced: {
      database: {
        validateSchema: true,
      },
    },
  });
}

export const auth = createAuthConfiguration(true);

export function createBootstrapAuth() {
  return createAuthConfiguration(false);
}
