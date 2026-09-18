import { describe, expect, it } from 'vitest';

import {
  DesignLoadError,
  DesignSchemaError,
  DesignSyntaxError,
  loadDesign,
} from './loadDesign';

/**
 * The fixture the upload story is demonstrated with: two nodes, one edge, as
 * the text of a file rather than as an object, because that is what the File
 * API hands the page.
 */
const twoNodesOneEdge = {
  title: 'Order intake',
  nodes: [
    { id: 'api', label: 'Public API', type: 'service' },
    { id: 'queue', label: 'Order queue', type: 'queue' },
  ],
  edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
};

/** The text of a file holding `design`, formatted the way a person would. */
function fileTextOf(design: unknown): string {
  return JSON.stringify(design, null, 2);
}

/** The schema error `loadDesign` threw, or a failure if it threw anything else. */
function schemaErrorFrom(text: string): DesignSchemaError {
  try {
    loadDesign(text);
  } catch (error) {
    if (error instanceof DesignSchemaError) {
      return error;
    }
    throw error;
  }

  throw new Error('Expected loadDesign to reject the design, but it returned one.');
}

/** The issue paths of a rejected design, as `'edges.0.to'` style strings. */
function issuePathsFrom(text: string): readonly string[] {
  return schemaErrorFrom(text).issues.map((issue) => issue.path.join('.'));
}

describe('loadDesign', () => {
  it('returns the title, nodes and edges of a two-node, one-edge file', () => {
    // Arrange
    const text = fileTextOf(twoNodesOneEdge);

    // Act
    const design = loadDesign(text);

    // Assert
    expect(design).toEqual(twoNodesOneEdge);
  });

  it('keeps every node and every edge, in the order the file lists them', () => {
    // The PRD's rule for the drawing: nothing dropped and nothing mislabeled.
    // Arrange
    const text = fileTextOf({
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
    });

    // Act
    const design = loadDesign(text);

    // Assert
    expect(design.nodes.map((node) => node.id)).toEqual(['web', 'app', 'db']);
    expect(design.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      'web->app',
      'app->db',
    ]);
  });

  it('returns empty lists for a file that has no nodes and no edges', () => {
    // Arrange
    const text = fileTextOf({ title: 'Empty', nodes: [], edges: [] });

    // Act
    const design = loadDesign(text);

    // Assert
    expect(design.nodes).toEqual([]);
    expect(design.edges).toEqual([]);
  });

  it('drops a property the schema does not name', () => {
    // Arrange
    const text = fileTextOf({ ...twoNodesOneEdge, notes: 'drafted friday' });

    // Act
    const design = loadDesign(text);

    // Assert
    expect(design).toEqual(twoNodesOneEdge);
  });

  describe('when the file is not JSON', () => {
    it('throws a DesignSyntaxError, not whatever JSON.parse threw', () => {
      // Arrange
      const text = '{ "title": "Order intake", }';

      // Act, Assert
      expect(() => loadDesign(text)).toThrow(DesignSyntaxError);
      expect(() => loadDesign(text)).toThrow(DesignLoadError);
    });

    it('keeps the position JSON.parse reported, for Task 04 to name a line', () => {
      // Arrange
      const text = '{\n  "title": "Order intake",\n}';
      const original = syntaxErrorOf(text);

      // Act
      let thrown: DesignSyntaxError | undefined;
      try {
        loadDesign(text);
      } catch (error) {
        thrown = error as DesignSyntaxError;
      }

      // Assert
      expect(thrown?.message).toBe(original.message);
      expect(thrown?.message).toMatch(/position \d+/);
      expect(thrown?.cause).toBeInstanceOf(SyntaxError);
    });

    it('carries the code invalid-json', () => {
      // Arrange
      const text = 'not json at all';

      // Act, Assert
      expect(schemaOrLoadErrorCode(text)).toBe('invalid-json');
    });

    it('rejects an empty file', () => {
      // A file the user picked by mistake is empty far more often than it is
      // valid JSON, and JSON.parse('') throws rather than returning undefined.
      // Act, Assert
      expect(() => loadDesign('')).toThrow(DesignSyntaxError);
    });
  });

  describe('when the JSON is not a design', () => {
    it('throws a DesignSchemaError carrying the issue path of the bad field', () => {
      // Arrange
      const text = fileTextOf({ nodes: [], edges: [] });

      // Act, Assert
      expect(issuePathsFrom(text)).toContain('title');
      expect(schemaOrLoadErrorCode(text)).toBe('invalid-design');
    });

    it('names the field of a node that is missing its label', () => {
      // Arrange
      const text = fileTextOf({
        title: 'Order intake',
        nodes: [{ id: 'api', type: 'service' }],
        edges: [],
      });

      // Act, Assert
      expect(issuePathsFrom(text)).toContain('nodes.0.label');
    });

    it('rejects two nodes that share an id', () => {
      // Arrange
      const text = fileTextOf({
        title: 'Order intake',
        nodes: [
          { id: 'api', label: 'Public API', type: 'service' },
          { id: 'api', label: 'Internal API', type: 'service' },
        ],
        edges: [],
      });

      // Act, Assert
      expect(issuePathsFrom(text)).toContain('nodes.1.id');
    });

    it('rejects an edge that names a node the file does not define', () => {
      // Arrange
      const text = fileTextOf({
        ...twoNodesOneEdge,
        edges: [{ from: 'api', to: 'ghost', label: 'publishes order' }],
      });

      // Act, Assert
      expect(issuePathsFrom(text)).toContain('edges.0.to');
    });

    it('reports every faulty field, not only the first', () => {
      // Task 04 gets to choose how many to show; the loader does not choose for it.
      // Arrange
      const text = fileTextOf({
        title: 'Order intake',
        nodes: [{ id: 'api', label: 'Public API' }],
        edges: [{ from: 'api', to: 'api' }],
      });

      // Act
      const paths = issuePathsFrom(text);

      // Assert
      expect(paths).toContain('nodes.0.type');
      expect(paths).toContain('edges.0.label');
    });

    it('checks the rules that span fields only once the fields are sound', () => {
      // A dangling edge and a node missing its type, together: only the field
      // is reported. The uniqueness and edge-target rules read whole lists, so
      // they cannot run over a shape that is not a design yet — the file has to
      // come back once its fields are right. Pinned here so the staging is a
      // decision rather than a surprise for Task 04.
      // Arrange
      const text = fileTextOf({
        title: 'Order intake',
        nodes: [{ id: 'api', label: 'Public API' }],
        edges: [{ from: 'api', to: 'ghost', label: 'publishes order' }],
      });

      // Act
      const paths = issuePathsFrom(text);

      // Assert
      expect(paths).toEqual(['nodes.0.type']);
    });

    it('keeps the Zod error itself as the cause', () => {
      // Arrange
      const text = fileTextOf({ title: 'Order intake', nodes: 'lots', edges: [] });

      // Act
      const error = schemaErrorFrom(text);

      // Assert
      expect(error.cause).toBeDefined();
      expect(error.issues.length).toBeGreaterThan(0);
    });
  });
});

/** What `JSON.parse` says about `text`, for comparing against what we rethrow. */
function syntaxErrorOf(text: string): SyntaxError {
  try {
    JSON.parse(text);
  } catch (error) {
    return error as SyntaxError;
  }

  throw new Error('Expected that text to be invalid JSON.');
}

/** The `code` of whatever `loadDesign` threw for `text`. */
function schemaOrLoadErrorCode(text: string): string {
  try {
    loadDesign(text);
  } catch (error) {
    if (error instanceof DesignLoadError) {
      return error.code;
    }
    throw error;
  }

  throw new Error('Expected loadDesign to reject that text, but it returned a design.');
}
