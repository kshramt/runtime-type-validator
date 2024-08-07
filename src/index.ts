// Handles optional intersection types expectedly.
// https://github.com/type-challenges/type-challenges/issues/8617#issuecomment-1166196791
export type TMerge<T> = { [K in keyof T]: T[K] };

type TPath =
  | undefined // Nothing to report
  | { invalid_element_key: { path: TPath } }
  | { invalid_element_value: { key: string | number; path: TPath } }
  | { invalid_value: unknown }
  | { length_not_equal: unknown }
  | { length_too_short: unknown }
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

type TValidator<T> = (value: unknown, path?: TRef<TPath>) => value is T;
export type $infer<VT> = VT extends TValidator<infer T> ? T : never;

export const parse = <T>(
  validator: TValidator<T>,
  value: unknown,
  path: TRef<TPath> = {},
): { success: true; value: T } | { success: false; path: TPath } => {
  if (validator(value, path)) {
    return { success: true, value };
  }
  return { success: false, path: path.value };
};

declare const OPQUE_TAG: unique symbol;
export type TOpaque<Name extends string, T> = T & {
  readonly [K in `__${Name}`]: typeof OPQUE_TAG;
};

export const $readonly = <V extends TValidator<unknown>>(validator: V) => {
  return (v: unknown): v is Readonly<$infer<V>> => {
    return validator(v);
  };
};

export const $opaque = <Name extends string, T>(
  _: Name,
  validator: TValidator<T>,
) => {
  return (value: unknown, path?: TRef<TPath>): value is TOpaque<Name, T> => {
    return validator(value, path);
  };
};

export const $typeGuard = <T>(
  validator: (x: unknown, ...rest: unknown[]) => x is T,
) => {
  return (value: unknown, path?: TRef<TPath>): value is T => {
    if (validator(value)) {
      return true;
    }
    if (path) {
      path.value = { invalid_value: value };
    }
    return false;
  };
};

export function $tuple<TTuple extends unknown[]>(
  validators: [...{ [K in keyof TTuple]: TValidator<TTuple[K]> }],
): (value: unknown, path?: TRef<TPath>) => value is readonly [...TTuple];
export function $tuple<TTuple extends unknown[], TRest>(
  validators: [...{ [K in keyof TTuple]: TValidator<TTuple[K]> }],
  rest: TValidator<TRest>,
): (
  value: unknown,
  path?: TRef<TPath>,
) => value is readonly [...TTuple, ...TRest[]];
export function $tuple<TTuple extends unknown[], TRest>(
  validators: [...{ [K in keyof TTuple]: TValidator<TTuple[K]> }],
  rest?: TValidator<TRest>,
) {
  if (rest === undefined) {
    return (
      value: unknown,
      path?: TRef<TPath>,
    ): value is readonly [...TTuple] => {
      if (!Array.isArray(value)) {
        if (path) {
          path.value = { not_array: value };
        }
        return false;
      }
      if (value.length !== validators.length) {
        if (path) {
          path.value = {
            length_not_equal: value,
          };
        }
        return false;
      }
      for (let i = 0; i < validators.length; ++i) {
        if (!validators[i](value[i], path)) {
          if (path) {
            path.value = {
              invalid_element_value: { key: i, path: path.value },
            };
          }
          return false;
        }
      }
      return true;
    };
  } else {
    return (
      value: unknown,
      path?: TRef<TPath>,
    ): value is readonly [...TTuple, ...TRest[]] => {
      if (!Array.isArray(value)) {
        if (path) {
          path.value = { not_array: value };
        }
        return false;
      }
      if (value.length < validators.length) {
        if (path) {
          path.value = {
            length_too_short: value,
          };
        }
        return false;
      }
      for (let i = 0; i < validators.length; ++i) {
        if (!validators[i](value[i], path)) {
          if (path) {
            path.value = {
              invalid_element_value: { key: i, path: path.value },
            };
          }
          return false;
        }
      }
      for (let i = validators.length; i < value.length; ++i) {
        if (!rest(value[i], path)) {
          if (path) {
            path.value = {
              invalid_element_value: { key: i, path: path.value },
            };
          }
          return false;
        }
      }
      return true;
    };
  }
}

type TNarrowable =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export const $literal = <T extends TNarrowable>(val: T) => {
  return (value: unknown, path?: TRef<TPath>): value is T => {
    if (value === val) {
      return true;
    }
    if (path) {
      path.value = { invalid_value: value };
    }
    return false;
  };
};

export const $array = <T>(validator: TValidator<T>) => {
  return (value: unknown, path?: TRef<TPath>): value is readonly T[] => {
    if (!Array.isArray(value)) {
      if (path) {
        path.value = { not_array: value };
      }
      return false;
    }
    for (let i = 0; i < value.length; ++i) {
      if (!validator(value[i], path)) {
        if (path) {
          path.value = { invalid_element_value: { key: i, path: path.value } };
        }
        return false;
      }
    }
    return true;
  };
};

export const $union = <T extends unknown[]>(
  ...validators: [...{ [K in keyof T]: TValidator<T[K]> }]
) => {
  return (value: unknown, path?: TRef<TPath>): value is T[number] => {
    const paths = [];
    for (const validator of validators) {
      const p: TRef<TPath> = {};
      if (validator(value, p)) {
        return true;
      } else {
        paths.push(p.value);
      }
    }
    if (path) {
      path.value = { not_union: paths };
    }
    return false;
  };
};

//type TIntersectionFromUnion<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

type TIntersectionFromUnion<U> = [U] extends [boolean]
  ? boolean
  : [U] extends [true | false]
  ? boolean
  : (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

export const $intersection = <Ts extends unknown[]>(
  ...validators: [...{ [I in keyof Ts]: TValidator<Ts[I]> }]
) => {
  return (
    value: unknown,
    path?: TRef<TPath>,
  ): value is TIntersectionFromUnion<Ts[number]> => {
    for (const validator of validators) {
      if (!validator(value, path)) {
        return false;
      }
    }
    return true;
  };
};

export const $record = <K extends string, VV extends TValidator<unknown>>(
  vk: TValidator<K>,
  vv: VV,
) => {
  return (
    value: unknown,
    path?: TRef<TPath>,
  ): value is Record<K, $infer<VV>> => {
    if (!isObject(value)) {
      if (path) {
        path.value = { not_object: value };
      }
      return false;
    }
    for (const k in value) {
      if (!vk(k, path)) {
        if (path) {
          path.value = { invalid_element_key: { path: path.value } };
        }
        return false;
      }
      const v = value[k];
      if (!vv(v, path)) {
        if (path) {
          path.value = { invalid_element_value: { key: k, path: path.value } };
        }
        return false;
      }
    }
    return true;
  };
};

export const $optional = <Kvs extends Record<string, TValidator<unknown>>>(
  kvs: Kvs,
) => {
  return (
    value: unknown,
    path?: TRef<TPath>,
  ): value is {
    [K in keyof Kvs]?: $infer<Kvs[K]>;
  } => {
    if (!isObject(value)) {
      if (path) {
        path.value = { not_object: value };
      }
      return false;
    }
    for (const k in kvs) {
      if (!(k in value)) {
        continue;
      }
      const validator = kvs[k];
      const result = validator(value[k], path);
      if (!result) {
        if (path) {
          path.value = {
            invalid_element_value: { key: k, path: path.value },
          };
        }
        return false;
      }
    }
    return true;
  };
};

export const $required = <Kvs extends Record<string, TValidator<unknown>>>(
  kvs: Kvs,
) => {
  return (
    value: unknown,
    path?: TRef<TPath>,
  ): value is {
    [K in keyof Kvs]: $infer<Kvs[K]>;
  } => {
    if (!isObject(value)) {
      if (path) {
        path.value = { not_object: value };
      }
      return false;
    }
    for (const k in kvs) {
      const validator = kvs[k];
      if (!(k in value)) {
        if (path) {
          path.value = { not_found: k };
        }
        return false;
      } else {
        const result = validator(value[k], path);
        if (!result) {
          if (path) {
            path.value = {
              invalid_element_value: { key: k, path: path.value },
            };
          }
          return false;
        }
      }
    }
    return true;
  };
};

const _$number = (value: unknown, path?: TRef<TPath>): value is number => {
  if (typeof value === "number") {
    return true;
  }
  if (path) {
    path.value = { not_number: value };
  }
  return false;
};
export const $number = () => {
  return _$number;
};

const _$string = (value: unknown, path?: TRef<TPath>): value is string => {
  if (typeof value === "string") {
    return true;
  }
  if (path) {
    path.value = { not_string: value };
  }
  return false;
};
export const $string = () => {
  return _$string;
};

const _$boolean = (value: unknown, path?: TRef<TPath>): value is boolean => {
  if (typeof value === "boolean") {
    return true;
  }
  if (path) {
    path.value = { not_boolean: value };
  }
  return false;
};
export const $boolean = () => {
  return _$boolean;
};

const _$null = (value: unknown, path?: TRef<TPath>): value is null => {
  if (value === null) {
    return true;
  }
  if (path) {
    path.value = { not_null: value };
  }
  return false;
};
export const $null = () => {
  return _$null;
};

const _$undefined = (
  value: unknown,
  path?: TRef<TPath>,
): value is undefined => {
  if (value === undefined) {
    return true;
  }
  if (path) {
    path.value = { not_undefined: value };
  }
  return false;
};
export const $undefined = () => {
  return _$undefined;
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value?.constructor === Object;
};
