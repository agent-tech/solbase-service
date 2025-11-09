import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the API and database',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed',
  })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Returns simple OK status for Kubernetes readiness probe',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-01-09T10:00:00.000Z',
      },
    },
  })
  ready() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Returns simple OK status for Kubernetes liveness probe',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-01-09T10:00:00.000Z',
      },
    },
  })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
