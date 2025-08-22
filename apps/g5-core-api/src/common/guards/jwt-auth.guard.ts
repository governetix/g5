import { AuthGuard } from '@nestjs/passport';
import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		if (process.env.DEV_DISABLE_AUTH === 'true') {
			return true;
		}
		return super.canActivate(context) as any;
	}
}
