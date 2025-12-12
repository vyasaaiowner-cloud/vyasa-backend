import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SchoolId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.schoolId as string | undefined;
  },
);
