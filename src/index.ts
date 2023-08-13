type TPath =
  | undefined // Nothing to report
  | { invalid_element: { key: string | number; path: TPath } }
  | { invalid_value: unknown }
  | { not_array: unknown }
  | { not_boolean: unknown }
  | { not_found: string }
  | { not_null: unknown }
  | { not_number: unknown }
  | { not_object: unknown }
  | { not_string: unknown }
  | { not_undefined: unknown }
  | { not_union: TPath[] };

type TRef<T> = { value?: T };

declare const OPQUE_TAG: unique symbol;
export type Opaque<Name extends string, T> = T & {
  readonly [K in `__${Name}`]: typeof OPQUE_TAG;
};

type TSchema<T> = {
  guard: (value: unknown, path: TRef<TPath>) => value is T;
  parse: (
    value: unknown,
    path: TRef<TPath>
  ) => { success: true; value: T } | { success: false; path: TPath };
};

export type TOut<T> = T extends TSchema<infer U> ? U : never;

type TWrapElementByTSchema<T extends object> = {
  [K in keyof T]: TSchema<T[K]>;
};

abstract class SBase<T> implements TSchema<T> {
  abstract guard: (value: unknown, path: TRef<TPath>) => value is T;

  parse = (
    value: unknown,
    path: TRef<TPath> = {}
  ): { success: true; value: T } | { success: false; path: TPath } => {
    if (this.guard(value, path)) {
      return { success: true, value };
    }
    return { success: false, path: path.value };
  };
}

class SOptional<T> extends SBase<T> {
  #spec: TSchema<T>;
  constructor(spec: TSchema<T>) {
    super();
    this.#spec = spec;
  }
  guard = (value: unknown, path: TRef<TPath> = {}): value is T => {
    return this.#spec.guard(value, path);
  };
}

export const sOptional = <T>(spec: TSchema<T>) => {
  return new SOptional(spec);
};

class SOpaque<Name extends string, T> extends SBase<Opaque<Name, T>> {
  #spec: TSchema<T>;
  constructor(_: Name, spec: TSchema<T>) {
    super();
    this.#spec = spec;
  }
  guard = (
    value: unknown,
    path: TRef<TPath> = {}
  ): value is Opaque<Name, T> => {
    return this.#spec.guard(value, path);
  };
}

export const sOpaque = <Name extends string, T>(
  name: Name,
  spec: TSchema<T>
) => {
  return new SOpaque(name, spec);
};

class STypeGuard<T> extends SBase<T> {
  #spec: (x: unknown, ...rest: unknown[]) => x is T;
  constructor(spec: (x: unknown, ...rest: unknown[]) => x is T) {
    super();
    this.#spec = spec;
  }
  guard = (value: unknown, path: TRef<TPath> = {}): value is T => {
    if (this.#spec(value)) {
      return true;
    }
    path.value = { invalid_value: value };
    return false;
  };
}

export const sTypeGuard = <T>(
  spec: (x: unknown, ...rest: unknown[]) => x is T
) => {
  return new STypeGuard(spec);
};

class STuple<T extends unknown[]> extends SBase<T> {
  #spec: TWrapElementByTSchema<[...T]>;
  constructor(...spec: TWrapElementByTSchema<[...T]>) {
    super();
    this.#spec = spec;
  }
  guard = (value: unknown, path: TRef<TPath> = {}): value is T => {
    if (!Array.isArray(value)) {
      path.value = { not_array: value };
      return false;
    }
    for (let i = 0; i < value.length; ++i) {
      if (!this.#spec[i].guard(value[i], path)) {
        path.value = { invalid_element: { key: i, path: path.value } };
        return false;
      }
    }
    return true;
  };
}

export const sTuple = <T extends unknown[]>(
  ...spec: TWrapElementByTSchema<[...T]>
) => {
  return new STuple(...spec);
};

type TNarrowable =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

class SLiteral<T extends TNarrowable> extends SBase<T> {
  #spec: T;
  constructor(spec: T) {
    super();
    this.#spec = spec;
  }
  guard = (value: unknown, path: TRef<TPath> = {}): value is T => {
    if (value === this.#spec) {
      return true;
    }
    path.value = { invalid_value: value };
    return false;
  };
}

export const sLiteral = <T extends TNarrowable>(spec: T) => {
  return new SLiteral(spec);
};

class SArray<T> extends SBase<T[]> {
  #spec: TSchema<T>;
  constructor(spec: TSchema<T>) {
    super();
    this.#spec = spec;
  }
  guard = (value: unknown, path: TRef<TPath> = {}): value is T[] => {
    if (!Array.isArray(value)) {
      path.value = { not_array: value };
      return false;
    }
    for (let i = 0; i < value.length; ++i) {
      if (!this.#spec.guard(value[i], path)) {
        path.value = { invalid_element: { key: i, path: path.value } };
        return false;
      }
    }
    return true;
  };
}

export const sArray = <T>(spec: TSchema<T>) => {
  return new SArray(spec);
};

class SUnion<T extends unknown[]> extends SBase<T[number]> {
  #spec: TWrapElementByTSchema<[...T]>;
  constructor(...spec: TWrapElementByTSchema<[...T]>) {
    super();
    this.#spec = spec;
  }
  guard = (value: unknown, path: TRef<TPath> = {}): value is T[number] => {
    const paths = [];
    for (const spec of this.#spec) {
      const p: TRef<TPath> = {};
      if (spec.guard(value, p)) {
        return true;
      } else {
        paths.push(p.value);
      }
    }
    path.value = { not_union: paths };
    return false;
  };
}

export const sUnion = <T extends unknown[]>(
  ...spec: TWrapElementByTSchema<[...T]>
) => {
  return new SUnion(...spec);
};

type TRequiredKeys<Spec extends object> = {
  [K in keyof Spec]: Spec[K] extends SOptional<infer _> ? never : K;
}[keyof Spec];
type _TObjectOut<Spec extends object> = {
  [K in keyof Spec]: Spec[K] extends TSchema<infer U> ? U : never;
};
type TObjectOut<Spec extends object> = _TObjectOut<
  Pick<Spec, TRequiredKeys<Spec>>
> &
  Partial<_TObjectOut<Spec>>;

class SObject<Spec extends Record<string, TSchema<unknown>>> extends SBase<
  TObjectOut<Spec>
> {
  #spec: Spec;
  constructor(spec: Spec) {
    super();
    this.#spec = spec;
  }
  guard = (
    value: unknown,
    path: TRef<TPath> = {}
  ): value is TObjectOut<Spec> => {
    if (!isObject(value)) {
      path.value = { not_object: value };
      return false;
    }
    for (const k in this.#spec) {
      const spec = this.#spec[k];
      if (!(k in value)) {
        if (spec instanceof SOptional) {
          continue;
        }
        path.value = { not_found: k };
        return false;
      } else {
        const result = spec.guard(value[k], path);
        if (!result) {
          path.value = { invalid_element: { key: k, path: path.value } };
          return false;
        }
      }
    }
    return true;
  };
}

export const sObject = <Spec extends Record<string, TSchema<unknown>>>(
  spec: Spec
) => {
  return new SObject(spec);
};

class SNumber extends SBase<number> {
  guard = (value: unknown, path: TRef<TPath> = {}): value is number => {
    if (typeof value === "number") {
      return true;
    }
    path.value = { not_number: value };
    return false;
  };
}
const _sNumber = new SNumber();

export const sNumber = () => {
  return _sNumber;
};

class SString extends SBase<string> {
  guard = (value: unknown, path: TRef<TPath> = {}): value is string => {
    if (typeof value === "string") {
      return true;
    }
    path.value = { not_string: value };
    return false;
  };
}
const _sString = new SString();

export const sString = () => {
  return _sString;
};

class SBoolean extends SBase<boolean> {
  guard = (value: unknown, path: TRef<TPath> = {}): value is boolean => {
    if (typeof value === "boolean") {
      return true;
    }
    path.value = { not_boolean: value };
    return false;
  };
}
const _sBoolean = new SBoolean();

export const sBoolean = () => {
  return _sBoolean;
};

class SNull extends SBase<null> {
  guard = (value: unknown, path: TRef<TPath> = {}): value is null => {
    if (value === null) {
      return true;
    }
    path.value = { not_null: value };
    return false;
  };
}
const _sNull = new SNull();

export const sNull = () => {
  return _sNull;
};

class SUndefined extends SBase<undefined> {
  guard = (value: unknown, path: TRef<TPath> = {}): value is undefined => {
    if (value === undefined) {
      return true;
    }
    path.value = { not_undefined: value };
    return false;
  };
}
const _sUndefined = new SUndefined();

export const sUndefined = () => {
  return _sUndefined;
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value?.constructor === Object;
};
