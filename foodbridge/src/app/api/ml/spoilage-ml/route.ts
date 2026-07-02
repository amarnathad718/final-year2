import { NextRequest } from 'next/server';
import { apiError } from '@/lib/api';

// Feature removed: spoilage ML predictor
export async function GET(request: NextRequest) {
  return apiError('This endpoint has been removed', 410);
}

export async function POST(request: NextRequest) {
  return apiError('This endpoint has been removed', 410);
}
