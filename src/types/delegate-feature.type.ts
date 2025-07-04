import type { Delegate } from './delegate.type';
import type { Feature } from './feature.type';

export type DelegateFeature<O> = Feature<O, { delegate: Delegate }>;
