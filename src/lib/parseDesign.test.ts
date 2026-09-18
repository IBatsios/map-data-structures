import { describe, expect, it } from 'vitest';

import { parseDesign } from './parseDesign';

/**
 * The fixture the walking skeleton is demonstrated with: two nodes, one edge.
 * It lives beside the test on purpose, so Task 09 stays free to author the real
 * `sample.json` without inheriting anything decided here.
 */
const twoNodesOneEdge = {
  title: 'Order intake',
  nodes: [
    { id: 'api', label: 'Public API', type: 'service' },
    { id: 'queue', label: 'Order queue', type: 'queue' },
  ],
  edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
};

describe('parseDesign', () => {
  it('returns the title, nodes and edges of a two-node, one-edge design', () => {
    // Arrange
    const json = structuredClone(twoNodesOneEdge);

    // Act
    const design = parseDesign(json);

    // Assert
    expect(design).toEqual({
      title: 'Order intake',
      nodes: [
        { id: 'api', label: 'Public API', type: 'service' },
        { id: 'queue', label: 'Order queue', type: 'queue' },
      ],
      edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
    });
  });

  it('keeps every node and every edge, in the order the file lists them', () => {
    // The PRD's rule for the drawing: nothing dropped and nothing mislabeled.
    // Arrange
    const json = {
      title: 'Three tiers',
      nodes: [
        { id: 'web', label: 'Web', type: 'ui' },
        { id: 'app', label: 'App', type: 'service' },
        { id: 'db', label: 'Database', type: 'store' },
      ],
      edges: [
        { from: 'web', to: 'app', label: 'calls' },
        { from: 'app', to: 'db', label: 'reads' },
      ],
    };

    // Act
    const design = parseDesign(json);

    // Assert
    expect(design.nodes.map((node) => node.id)).toEqual(['web', 'app', 'db']);
    expect(design.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      'web->app',
      'app->db',
    ]);
  });

  it('returns empty lists for a design that has no nodes and no edges', () => {
    // Arrange
    const json = { title: 'Empty', nodes: [], edges: [] };

    // Act
    const design = parseDesign(json);

    // Assert
    expect(design.nodes).toEqual([]);
    expect(design.edges).toEqual([]);
  });

  it('does not mutate the object it was given', () => {
    // parseDesign has to stay pure: Task 03's layout runs on its output, and
    // Task 02 replaces its innards with a validating loader.
    // Arrange
    const json = structuredClone(twoNodesOneEdge);

    // Act
    const design = parseDesign(json);

    // Assert
    expect(json).toEqual(twoNodesOneEdge);
    expect(design.nodes).not.toBe(json.nodes);
    expect(design.nodes[0]).not.toBe(json.nodes[0]);
  });
});
