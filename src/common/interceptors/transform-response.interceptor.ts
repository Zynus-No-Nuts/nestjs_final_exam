import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  meta: Record<string, unknown> | null;
}

interface PaginatedPayload<T> {
  data: T;
  meta: Record<string, unknown>;
}

function isPaginatedPayload<T>(value: unknown): value is PaginatedPayload<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    typeof (value as Record<string, unknown>).meta === 'object'
  );
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const customMessage = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((payload: T) => {
        const statusCode = response.statusCode;
        const message = customMessage ?? 'Success';

        if (isPaginatedPayload<T>(payload)) {
          return {
            statusCode,
            message,
            data: payload.data,
            meta: payload.meta,
          };
        }

        return {
          statusCode,
          message,
          data: payload ?? (null as T),
          meta: null,
        };
      }),
    );
  }
}
