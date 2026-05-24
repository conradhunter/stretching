import type { View } from 'react-native';
import type { Rect } from './geometry';

/** Promisified `measureInWindow` for a host node; resolves null if the node is gone. */
export function measureFrame(node: View | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}
