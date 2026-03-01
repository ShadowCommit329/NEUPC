/**
 * @file Health check API endpoint
 * @module HealthCheck
 *
 * Provides a lightweight endpoint for monitoring services (UptimeRobot,
 * Vercel, load balancers) to verify the application is running.
 *
 * GET /api/health → { status: 'ok', timestamp, uptime, version }
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startTime = Date.now();

export async function GET() {
  const now = Date.now();

  const health = {
    status: 'ok',
    timestamp: new Date(now).toISOString(),
    uptime: Math.floor((now - startTime) / 1000),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'unknown',
  };

  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
