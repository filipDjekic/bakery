import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { z } from 'zod';

import { createBootstrapAuth } from '../src/server/auth/auth.ts';
import { authPrisma } from '../src/server/auth/prisma.ts';

const adminInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(128),
});

export class AdminAlreadyExistsError extends Error {
  constructor() {
    super('An administrator already exists.');
    this.name = 'AdminAlreadyExistsError';
  }
}

export async function createFirstAdmin(input: unknown): Promise<{
  id: string;
  email: string;
}> {
  const parsed = adminInputSchema.parse(input);

  const existingAdmin = await authPrisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
    select: {
      id: true,
    },
  });

  if (existingAdmin) {
    throw new AdminAlreadyExistsError();
  }

  const auth = createBootstrapAuth();

  const created = await auth.api.signUpEmail({
    body: parsed,
  });

  const admin = await authPrisma.user.update({
    where: {
      id: created.user.id,
    },
    data: {
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
    },
  });

  return admin;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.CONFIRM_PRODUCTION_ADMIN_BOOTSTRAP !== 'CREATE_FIRST_ADMIN'
  ) {
    throw new Error(
      'Production admin bootstrap was not explicitly confirmed.',
    );
  }

  if (!email || !name || !password) {
    throw new Error(
      'Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD for this one command.',
    );
  }

  //delete process.env.ADMIN_PASSWORD;

  const admin = await createFirstAdmin({
    email,
    name,
    password,
  });

  console.info(`Administrator created: ${admin.email}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
    .catch((error: unknown) => {
      if (error instanceof AdminAlreadyExistsError) {
        console.error(error.message);
      } else if (error instanceof z.ZodError) {
        console.error('Admin input is invalid or the password is too weak.');
        console.error(error.issues);
      } else {
        console.error('Administrator could not be created.');
        console.error(error);
      }

      process.exitCode = 1;
    })
    .finally(async () => {
      await authPrisma.$disconnect();
    });
}