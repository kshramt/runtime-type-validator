// Handles optional intersection types expectedly.
// https://github.com/type-challenges/type-challenges/issues/8617#issuecomment-1166196791
export type TMerge<T> = { [K in keyof T]: T[K] };

type TPath =
  | undefined // Nothing to report
  | { invalid_element_key: { path: TPath } }
  | { invalid_element_value: { key: string | number; path: TPath } }
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

const TAGS = Symbol("TAGS");
type TTags = {
  optional?: true;
  readonly?: true;
};
type TValidator<T> = {
  (value: unknown, path: TRef<TPath>): value is T;
  [TAGS]?: TTags;
};
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
  const res = ((value: unknown, path: TRef<TPath>): value is $infer<V> => {
    return validator(value, path);
  }) as V & { [TAGS]: { readonly: true } };
  res[TAGS] = { ...validator[TAGS], readonly: true };
  return res;
};

export const $optional = <V extends TValidator<unknown>>(validator: V) => {
  const res = ((value: unknown, path: TRef<TPath>): value is $infer<V> => {
    return validator(value, path);
  }) as V & { [TAGS]: { optional: true } };
  res[TAGS] = { ...validator[TAGS], optional: true };
  return res;
};

export const $opaque = <Name extends string, T>(
  _: Name,
  validator: TValidator<T>,
) => {
  return (value: unknown, path: TRef<TPath>): value is TOpaque<Name, T> => {
    return validator(value, path);
  };
};

export const $typeGuard = <T>(
  validator: (x: unknown, ...rest: unknown[]) => x is T,
) => {
  return (value: unknown, path: TRef<TPath>): value is T => {
    if (validator(value)) {
      return true;
    }
    path.value = { invalid_value: value };
    return false;
  };
};

export const $tuple = <T extends unknown[]>(
  ...validators: [...{ [K in keyof T]: TValidator<T[K]> }]
) => {
  return (value: unknown, path: TRef<TPath>): value is T => {
    if (!Array.isArray(value)) {
      path.value = { not_array: value };
      return false;
    }
    for (let i = 0; i < validators.length; ++i) {
      if (!validators[i](value[i], path)) {
        path.value = { invalid_element_value: { key: i, path: path.value } };
        return false;
      }
    }
    return true;
  };
};

type TNarrowable =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export const $literal = <T extends TNarrowable>(val: T) => {
  return (value: unknown, path: TRef<TPath>): value is T => {
    if (value === val) {
      return true;
    }
    path.value = { invalid_value: value };
    return false;
  };
};

export const $array = <T>(validator: TValidator<T>) => {
  return (value: unknown, path: TRef<TPath>): value is T[] => {
    if (!Array.isArray(value)) {
      path.value = { not_array: value };
      return false;
    }
    for (let i = 0; i < value.length; ++i) {
      if (!validator(value[i], path)) {
        path.value = { invalid_element_value: { key: i, path: path.value } };
        return false;
      }
    }
    return true;
  };
};

export const $union = <T extends unknown[]>(
  ...validators: [...{ [K in keyof T]: TValidator<T[K]> }]
) => {
  return (value: unknown, path: TRef<TPath>): value is T[number] => {
    const paths = [];
    for (const validator of validators) {
      const p: TRef<TPath> = {};
      if (validator(value, p)) {
        return true;
      } else {
        paths.push(p.value);
      }
    }
    path.value = { not_union: paths };
    return false;
  };
};

type TOptionalKeys<Kvs extends object> = {
  [K in keyof Kvs]: Kvs[K] extends { [TAGS]: { optional: true } } ? K : never;
}[keyof Kvs];
type TRequiredKeys<Kvs extends object> = Exclude<keyof Kvs, TOptionalKeys<Kvs>>;
type TFilterOptional<Kvs extends object> = {
  [K in TOptionalKeys<Kvs>]: Kvs[K];
};
type TFilterRequired<Kvs extends object> = {
  [K in TRequiredKeys<Kvs>]: Kvs[K];
};

type TReadonlyKeys<Kvs extends object> = {
  [K in keyof Kvs]: Kvs[K] extends { [TAGS]: { readonly: true } } ? K : never;
}[keyof Kvs];
type TNonReadonlyKeys<Kvs extends object> = Exclude<
  keyof Kvs,
  TReadonlyKeys<Kvs>
>;
type TFilterReadonly<Kvs extends object> = {
  readonly [K in TReadonlyKeys<Kvs>]: Kvs[K];
};
type TFilterNonReadonly<Kvs extends object> = {
  [K in TNonReadonlyKeys<Kvs>]: Kvs[K];
};

type _TInferReadonlyOptionalValues<Kvs extends object> = {
  readonly [K in keyof Kvs]?: $infer<Kvs[K]>;
};
type _TInferNonReadonlyOptionalValues<Kvs extends object> = {
  [K in keyof Kvs]?: $infer<Kvs[K]>;
};
type _TInferReadonlyRequiredValues<Kvs extends object> = {
  readonly [K in keyof Kvs]: $infer<Kvs[K]>;
};
type _TInferNonReadonlyRequiredValues<Kvs extends object> = {
  [K in keyof Kvs]: $infer<Kvs[K]>;
};
type TInferValues<Kvs extends object> = _TInferReadonlyOptionalValues<
  TFilterReadonly<TFilterOptional<Kvs>>
> &
  _TInferReadonlyRequiredValues<TFilterReadonly<TFilterRequired<Kvs>>> &
  _TInferNonReadonlyOptionalValues<TFilterNonReadonly<TFilterOptional<Kvs>>> &
  _TInferNonReadonlyRequiredValues<TFilterNonReadonly<TFilterRequired<Kvs>>>;

export const $record = <K extends string, VV extends TValidator<unknown>>(
  vk: TValidator<K>,
  vv: VV,
) => {
  return (
    value: unknown,
    path: TRef<TPath>,
  ): value is VV extends { [TAGS]: { readonly: true } }
    ? { readonly [_ in K]: $infer<VV> }
    : { [_ in K]: $infer<VV> } => {
    if (!isObject(value)) {
      path.value = { not_object: value };
      return false;
    }
    for (const k in value) {
      if (!vk(k, path)) {
        path.value = { invalid_element_key: { path: path.value } };
        return false;
      }
      const v = value[k];
      if (!vv(v, path)) {
        path.value = { invalid_element_value: { key: k, path: path.value } };
        return false;
      }
    }
    return true;
  };
};

export const $object = <Kvs extends Record<string, TValidator<unknown>>>(
  kvs: Kvs,
) => {
  return (value: unknown, path: TRef<TPath>): value is TInferValues<Kvs> => {
    if (!isObject(value)) {
      path.value = { not_object: value };
      return false;
    }
    for (const k in kvs) {
      const validator = kvs[k];
      if (!(k in value)) {
        if (validator[TAGS]?.optional) {
          continue;
        }
        path.value = { not_found: k };
        return false;
      } else {
        const result = validator(value[k], path);
        if (!result) {
          path.value = { invalid_element_value: { key: k, path: path.value } };
          return false;
        }
      }
    }
    return true;
  };
};

const _$number = (value: unknown, path: TRef<TPath>): value is number => {
  if (typeof value === "number") {
    return true;
  }
  path.value = { not_number: value };
  return false;
};
export const $number = () => {
  return _$number;
};

const _$string = (value: unknown, path: TRef<TPath>): value is string => {
  if (typeof value === "string") {
    return true;
  }
  path.value = { not_string: value };
  return false;
};
export const $string = () => {
  return _$string;
};

const _$boolean = (value: unknown, path: TRef<TPath>): value is boolean => {
  if (typeof value === "boolean") {
    return true;
  }
  path.value = { not_boolean: value };
  return false;
};
export const $boolean = () => {
  return _$boolean;
};

const _$null = (value: unknown, path: TRef<TPath>): value is null => {
  if (value === null) {
    return true;
  }
  path.value = { not_null: value };
  return false;
};
export const $null = () => {
  return _$null;
};

const _$undefined = (value: unknown, path: TRef<TPath>): value is undefined => {
  if (value === undefined) {
    return true;
  }
  path.value = { not_undefined: value };
  return false;
};
export const $undefined = () => {
  return _$undefined;
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value?.constructor === Object;
};
