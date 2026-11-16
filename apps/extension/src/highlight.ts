import type { FillReport } from './types';

export function paintReport(report: FillReport): void {
  for (const item of report.items) {
    item.element.style.outline = item.status === 'filled' ? '2px solid #16a34a' : '';
    item.element.style.outlineOffset = item.status === 'filled' ? '2px' : '';
    if (item.status === 'uncertain') {
      item.element.style.outline = '2px solid #ca8a04';
      item.element.style.outlineOffset = '2px';
    }
  }
}
