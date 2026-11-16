import type { PlatformAdapter } from '../types';
import { ashbyAdapter } from './ashby';
import { genericAdapter } from './generic';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { workdayAdapter } from './workday';

const ADAPTERS = [greenhouseAdapter, leverAdapter, ashbyAdapter, workdayAdapter] as const;

const AUTO_IDS = new Set<PlatformAdapter['id']>(['greenhouse', 'lever', 'ashby', 'workday']);

export function detectAdapter(url: URL, doc: Document): PlatformAdapter | null {
  return ADAPTERS.find((adapter) => adapter.matches(url, doc)) ?? null;
}

export function isAutoAdapter(adapter: PlatformAdapter): boolean {
  return AUTO_IDS.has(adapter.id);
}

export { ashbyAdapter, genericAdapter, greenhouseAdapter, leverAdapter, workdayAdapter };
