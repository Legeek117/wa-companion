import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;

// Type augmentation for global.prisma in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
