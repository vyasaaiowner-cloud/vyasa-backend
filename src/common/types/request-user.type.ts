import { Role } from '@prisma/client';

export type RequestUser = {
  sub: string;           // userId
  email: string;
  role: Role;
  schoolId?: string | null;
};
