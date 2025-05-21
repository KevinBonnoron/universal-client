import type { Delegate } from './delegate.type';
import type { Feature } from './feature.type';

export type DelegateFeature<O = { delegate: Delegate }> = Feature<{ delegate: Delegate }, O & { delegate: Delegate }>;
