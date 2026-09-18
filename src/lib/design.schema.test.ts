import { describe, expect, it } from 'vitest';

import { designEdgeSchema, designNodeSchema, designSchema } from './design.schema';

/**
 * The shape every other test in this file bends out of true one field at a time:
 * two nodes joined by one edge. It lives beside the test on purpose, so Task 09
 * stays free to author the real `sample.json` without inheriting anything here.
 */
const twoNodesOneEdge = {
  title: 'Order intake',
  nodes: [
    { id: 'api', label: 'Public API', type: 'service' },
    { id: 'queue', label: 'Order queue', type: 'queue' },
  ],
  edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
};

/** The issue paths of a failed parse, as `'nodes.0.id'` style strings. */
function issuePathsOf(value: unknown): readonly string[] {
  const result = designSchema.safeParse(value);

  if (result.success) {
    throw new Error('Expected the design to be rejected, but it parsed.');
  }

  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('designNodeSchema', () => {
  it('accepts a node with an id, a label and a type', () => {
    // Arrange
    const node = { id: 'api', label: 'Public API', type: 'service' };

    // Act
    const result = designNodeSchema.safeParse(node);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each(['id', 'label', 'type'])('rejects a node missing its %s', (field) => {
    // Arrange
    const node: Record<string, unknown> = {
      id: 'api',
      label: 'Public API',
      type: 'service',
    };
    delete node[field];

    // Act
    const result = designNodeSchema.safeParse(node);

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects an empty id, because an edge has to be able to name it', () => {
    // Arrange
    const node = { id: '', label: 'Public API', type: 'service' };

    // Act
    const result = designNodeSchema.safeParse(node);

    // Assert
    expect(result.success).toBe(false);
  });

  it.each(['id', 'label', 'type'])(
    'rejects a node whose %s holds nothing but whitespace',
    (field) => {
      // A label of three spaces draws a blank box, which is the very thing the
      // "no empty string" rule exists to stop, so the rule reads visible
      // characters rather than any characters at all.
      // Arrange
      const node: Record<string, unknown> = {
        id: 'api',
        label: 'Public API',
        type: 'service',
      };
      node[field] = '   ';

      // Act
      const result = designNodeSchema.safeParse(node);

      // Assert
      expect(result.success).toBe(false);
    },
  );

  it('keeps the spaces around a label it accepts, rather than trimming them', () => {
    // Rejecting a blank label is not the same as editing a padded one: the
    // drawing must show what the file says.
    // Arrange
    const node = { id: 'api', label: '  Public API  ', type: 'service' };

    // Act
    const result = designNodeSchema.parse(node);

    // Assert
    expect(result.label).toBe('  Public API  ');
  });

  it('rejects an id that is not a string', () => {
    // Arrange
    const node = { id: 7, label: 'Public API', type: 'service' };

    // Act
    const result = designNodeSchema.safeParse(node);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('designEdgeSchema', () => {
  it('accepts an edge with a from, a to and a label', () => {
    // Arrange
    const edge = { from: 'api', to: 'queue', label: 'publishes order' };

    // Act
    const result = designEdgeSchema.safeParse(edge);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each(['from', 'to', 'label'])('rejects an edge missing its %s', (field) => {
    // Arrange
    const edge: Record<string, unknown> = {
      from: 'api',
      to: 'queue',
      label: 'publishes order',
    };
    delete edge[field];

    // Act
    const result = designEdgeSchema.safeParse(edge);

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects an edge whose label holds nothing but whitespace', () => {
    // Arrange
    const edge = { from: 'api', to: 'queue', label: ' ' };

    // Act
    const result = designEdgeSchema.safeParse(edge);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('designSchema', () => {
  it('accepts a two-node, one-edge design and returns it unchanged', () => {
    // Arrange
    const design = structuredClone(twoNodesOneEdge);

    // Act
    const result = designSchema.parse(design);

    // Assert
    expect(result).toEqual(twoNodesOneEdge);
  });

  it('keeps every node and every edge in the order the file lists them', () => {
    // The PRD's rule for the drawing: nothing dropped and nothing mislabeled.
    // Arrange
    const design = {
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
    const result = designSchema.parse(design);

    // Assert
    expect(result.nodes.map((node) => node.id)).toEqual(['web', 'app', 'db']);
    expect(result.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      'web->app',
      'app->db',
    ]);
  });

  it('accepts a design with no nodes and no edges', () => {
    // Arrange
    const design = { title: 'Empty', nodes: [], edges: [] };

    // Act
    const result = designSchema.parse(design);

    // Assert
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('ignores a property the schema does not name rather than failing', () => {
    // Arrange
    const design = { ...structuredClone(twoNodesOneEdge), notes: 'drafted friday' };

    // Act
    const result = designSchema.parse(design);

    // Assert
    expect(result).toEqual(twoNodesOneEdge);
  });

  it('does not mutate the object it was given', () => {
    // Arrange
    const design = structuredClone(twoNodesOneEdge);

    // Act
    const result = designSchema.parse(design);

    // Assert
    expect(design).toEqual(twoNodesOneEdge);
    expect(result.nodes).not.toBe(design.nodes);
  });

  it.each(['title', 'nodes', 'edges'])('rejects a design missing its %s', (field) => {
    // Arrange
    const design: Record<string, unknown> = structuredClone(twoNodesOneEdge);
    delete design[field];

    // Act, Assert
    expect(issuePathsOf(design)).toContain(field);
  });

  it.each([
    ['a JSON array', []],
    ['a string', 'Order intake'],
    ['null', null],
  ])('rejects %s where a design object belongs', (_name, value) => {
    // Act
    const result = designSchema.safeParse(value);

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects a title that holds nothing but whitespace', () => {
    // Arrange
    const design = { ...structuredClone(twoNodesOneEdge), title: '\t\n ' };

    // Act, Assert
    expect(issuePathsOf(design)).toContain('title');
  });

  it('reports one issue for a field that is blank, not two', () => {
    // The panel shows one message per problem, so a single blank field has to
    // arrive as a single issue rather than as "too small" and "blank" both.
    // Arrange
    const design = { ...structuredClone(twoNodesOneEdge), title: '' };

    // Act, Assert
    expect(issuePathsOf(design)).toEqual(['title']);
  });

  it('rejects two nodes that share an id, naming the second one', () => {
    // Two nodes with one id draw two boxes, but every edge touching that id
    // resolves to whichever box came last: a silently wrong drawing.
    // Arrange
    const design = {
      title: 'Order intake',
      nodes: [
        { id: 'api', label: 'Public API', type: 'service' },
        { id: 'api', label: 'Internal API', type: 'service' },
      ],
      edges: [],
    };

    // Act, Assert
    expect(issuePathsOf(design)).toContain('nodes.1.id');
  });

  it('rejects an edge whose from names a node the design does not define', () => {
    // Arrange
    const design = {
      ...structuredClone(twoNodesOneEdge),
      edges: [{ from: 'ghost', to: 'queue', label: 'publishes order' }],
    };

    // Act, Assert
    expect(issuePathsOf(design)).toContain('edges.0.from');
  });

  it('rejects an edge whose to names a node the design does not define', () => {
    // Arrange
    const design = {
      ...structuredClone(twoNodesOneEdge),
      edges: [{ from: 'api', to: 'ghost', label: 'publishes order' }],
    };

    // Act, Assert
    expect(issuePathsOf(design)).toContain('edges.0.to');
  });

  it('names the undefined node in the message, so Task 04 can quote it', () => {
    // Arrange
    const design = {
      ...structuredClone(twoNodesOneEdge),
      edges: [{ from: 'api', to: 'ghost', label: 'publishes order' }],
    };

    // Act
    const result = designSchema.safeParse(design);

    // Assert
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages.join(' ')).toContain('ghost');
  });

  it('accepts an edge that joins a node to itself', () => {
    // A self-edge names a node the design defines, so the rule above has no
    // quarrel with it; Task 03 decides how to draw it.
    // Arrange
    const design = {
      title: 'Retry',
      nodes: [{ id: 'worker', label: 'Worker', type: 'service' }],
      edges: [{ from: 'worker', to: 'worker', label: 'retries' }],
    };

    // Act
    const result = designSchema.safeParse(design);

    // Assert
    expect(result.success).toBe(true);
  });
});
