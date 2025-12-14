import { Role } from '@prisma/client';

export type RequestUser = {
  sub: string;           // userId
  phone: string;
  role: Role;
  schoolId?: string | null;
};
