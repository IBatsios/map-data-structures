import { describe, expect, it } from 'vitest';

import { DEFAULT_SHAPE, KNOWN_SHAPES, shapeForType } from './shapes';

describe('shapeForType', () => {
  it('draws a service as a rounded rectangle', () => {
    expect(shapeForType('service').name).toBe('rounded');
  });

  it('draws a database as a cylinder', () => {
    expect(shapeForType('database').name).toBe('cylinder');
  });

  it('draws a queue as a stadium', () => {
    expect(shapeForType('queue').name).toBe('stadium');
  });

  it('draws an external system as a cut-corner rectangle', () => {
    expect(shapeForType('external').name).toBe('cutCorner');
  });

  it('draws a user as a hexagon', () => {
    expect(shapeForType('user').name).toBe('hexagon');
  });

  it('draws a decision as a diamond', () => {
    expect(shapeForType('decision').name).toBe('diamond');
  });

  it('reads an alias as its canonical kind', () => {
    expect(shapeForType('db').kind).toBe('database');
    expect(shapeForType('actor').kind).toBe('user');
    expect(shapeForType('topic').kind).toBe('queue');
  });

  it('matches a type whatever its case', () => {
    expect(shapeForType('Database')).toEqual(shapeForType('database'));
    expect(shapeForType('QUEUE')).toEqual(shapeForType('queue'));
  });

  it('matches a type that the file padded with spaces', () => {
    expect(shapeForType('  service  ')).toEqual(shapeForType('service'));
  });

  it('still draws a type it does not recognise, using the default shape', () => {
    const shape = shapeForType('widget-factory');

    expect(shape).toEqual(DEFAULT_SHAPE);
    expect(shape.isDefault).toBe(true);
    expect(shape.name).toBe('rectangle');
  });

  it('still draws an empty or blank type rather than throwing', () => {
    expect(shapeForType('').isDefault).toBe(true);
    expect(shapeForType('   ').isDefault).toBe(true);
  });

  it('gives every kind it knows a silhouette of its own', () => {
    const names = KNOWN_SHAPES.map((shape) => shape.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('marks every kind it knows as recognised, and reserves the default', () => {
    for (const shape of KNOWN_SHAPES) {
      expect(shape.isDefault).toBe(false);
    }

    expect(DEFAULT_SHAPE.isDefault).toBe(true);
  });

  it('gives every shape room around its text', () => {
    for (const shape of [...KNOWN_SHAPES, DEFAULT_SHAPE]) {
      expect(shape.padding.x).toBeGreaterThan(0);
      expect(shape.padding.y).toBeGreaterThan(0);
    }
  });
});
