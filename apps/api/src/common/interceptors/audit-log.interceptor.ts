import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * AuditLogInterceptor
 * 
 * Logs all assessment-related mutation requests (POST, PATCH, PUT, DELETE)
 * to the application logger for observability. The actual audit trail entries
 * are created by the AuditService within each service method for precise
 * field-level tracking.
 * 
 * This interceptor provides a secondary, request-level audit layer that
 * captures HTTP method, path, user, and response status for all mutations
 * on assessment-related endpoints.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger('AuditLog');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body } = request;

        // Only log mutations (POST, PATCH, PUT, DELETE)
        const mutationMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
        if (!mutationMethods.includes(method)) {
            return next.handle();
        }

        // Only log assessment-related endpoints
        const assessmentPaths = ['/assessments', '/audit'];
        const isAssessmentRelated = assessmentPaths.some((path) =>
            url.includes(path),
        );

        if (!isAssessmentRelated) {
            return next.handle();
        }

        const userId = request.user?.id ?? 'anonymous';
        const startTime = Date.now();

        this.logger.log(
            `[AUDIT] ${method} ${url} | User: ${userId} | Body: ${JSON.stringify(this.sanitizeBody(body))}`,
        );

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    this.logger.log(
                        `[AUDIT] ${method} ${url} | User: ${userId} | Status: SUCCESS | Duration: ${duration}ms`,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.warn(
                        `[AUDIT] ${method} ${url} | User: ${userId} | Status: ERROR ${error.status || 500} | Duration: ${duration}ms | Message: ${error.message}`,
                    );
                },
            }),
        );
    }

    /**
     * Remove sensitive fields from the body before logging.
     */
    private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
        if (!body || typeof body !== 'object') return {};

        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'secret', 'authorization'];

        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }
}
