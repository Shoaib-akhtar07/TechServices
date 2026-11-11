import { buildLlms, markdownResponse } from '@/lib/server/llms';

export const revalidate = 3600;

export async function GET() {
  return markdownResponse(await buildLlms({ full: true }));
}
