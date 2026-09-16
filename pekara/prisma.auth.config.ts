import 'dotenv/config';

const authPrismaConfig = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

export default authPrismaConfig;
