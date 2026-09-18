import { describe, expect, it } from 'vitest';

import { describeUpload } from './describeUpload';
import type { Design } from './design.types';

/** A design of `nodeCount` nodes joined by `edgeCount` edges, for counting. */
function designOf(nodeCount: number, edgeCount: number): Design {
  const nodes = Array.from({ length: nodeCount }, (_unused, index) => ({
    id: `n${index}`,
    label: `Node ${index}`,
    type: 'service',
  }));
  const edges = Array.from({ length: edgeCount }, (_unused, index) => ({
    from: 'n0',
    to: 'n0',
    label: `Edge ${index}`,
  }));

  return { title: 'Counted', nodes, edges };
}

describe('describeUpload', () => {
  it('names the file and counts its nodes and edges', () => {
    // Arrange
    const design = designOf(2, 1);

    // Act
    const description = describeUpload('order-intake.json', design);

    // Assert
    expect(description).toBe('Loaded order-intake.json: 2 nodes, 1 edge.');
  });

  it('counts one node and one edge in the singular', () => {
    // Arrange
    const design = designOf(1, 1);

    // Act
    const description = describeUpload('one.json', design);

    // Assert
    expect(description).toBe('Loaded one.json: 1 node, 1 edge.');
  });

  it('counts an empty design as no nodes and no edges', () => {
    // Arrange
    const design = designOf(0, 0);

    // Act
    const description = describeUpload('empty.json', design);

    // Assert
    expect(description).toBe('Loaded empty.json: 0 nodes, 0 edges.');
  });

  it('counts every node and every edge the design holds', () => {
    // The status line is the user's only check that nothing was dropped, so it
    // counts what is in the design rather than what is distinct in it.
    // Arrange
    const design = designOf(12, 30);

    // Act
    const description = describeUpload('big.json', design);

    // Assert
    expect(description).toContain('12 nodes');
    expect(description).toContain('30 edges');
  });

  it('shows the file name as the file gave it, without inventing one', () => {
    // Arrange
    const design = designOf(1, 0);

    // Act
    const description = describeUpload('Copy of My Design (2).json', design);

    // Assert
    expect(description).toContain('Copy of My Design (2).json');
  });
});
