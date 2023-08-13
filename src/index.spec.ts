import * as vt from "vitest";

import * as T from "./index.js";

vt.test("sUnion", () => {
  const schema = T.sUnion([T.sObject({ a: T.sNull() }), T.sString()]);
  vt.expect(schema.parse("ok")).toStrictEqual({
    success: true,
    value: "ok",
  });
  vt.expect(schema.parse({ a: null })).toStrictEqual({
    success: true,
    value: { a: null },
  });
  vt.expect(schema.parse({ a: 9 })).toStrictEqual({
    success: false,
    path: {
      not_union: [
        { invalid_element: { key: "a", path: { not_null: 9 } } },
        { not_string: { a: 9 } },
      ],
    },
  });
});

vt.test("sArray", () => {
  const schema = T.sArray(T.sUnion([T.sString(), T.sNull()]));
  vt.expect(schema.parse(["a", "b"])).toStrictEqual({
    success: true,
    value: ["a", "b"],
  });
  vt.expect(schema.parse(["a", null])).toStrictEqual({
    success: true,
    value: ["a", null],
  });
  vt.expect(schema.parse(["a", 1])).toStrictEqual({
    success: false,
    path: {
      invalid_element: {
        key: 1,
        path: { not_union: [{ not_string: 1 }, { not_null: 1 }] },
      },
    },
  });
  vt.expect(schema.parse({ a: 1 })).toStrictEqual({
    success: false,
    path: { not_array: { a: 1 } },
  });
});

vt.test("sTuple", () => {
  const schema = T.sTuple([T.sNull(), T.sString(), T.sLiteral("literal")]);
  vt.expect(schema.parse([null, "a", "literal"])).toStrictEqual({
    success: true,
    value: [null, "a", "literal"],
  });
  vt.expect(schema.parse([null, 1, "literal"])).toStrictEqual({
    success: false,
    path: { invalid_element: { key: 1, path: { not_string: 1 } } },
  });
  vt.expect(schema.parse([null, "a", "LITERAL"])).toStrictEqual({
    success: false,
    path: { invalid_element: { key: 2, path: { invalid_value: "LITERAL" } } },
  });
  vt.expect(schema.parse({ a: 1 })).toStrictEqual({
    success: false,
    path: { not_array: { a: 1 } },
  });
});

vt.test("sObject", () => {
  {
    const schema = T.sObject({
      a: T.sBoolean(),
      b: T.sNumber(),
    });
    vt.expect(schema.parse({ a: true, b: 1 })).toStrictEqual({
      success: true,
      value: { a: true, b: 1 },
    });
    vt.expect(schema.parse({ a: true, b: "b" })).toStrictEqual({
      success: false,
      path: { invalid_element: { key: "b", path: { not_number: "b" } } },
    });
    vt.expect(schema.parse({ a: null, b: 1 })).toStrictEqual({
      success: false,
      path: { invalid_element: { key: "a", path: { not_boolean: null } } },
    });
    vt.expect(schema.parse({ b: 1 })).toStrictEqual({
      success: false,
      path: { not_found: "a" },
    });
  }
  {
    const schema = T.sObject({ a: T.sUndefined() });
    vt.expect(schema.parse({ a: undefined })).toStrictEqual({
      success: true,
      value: { a: undefined },
    });
    vt.expect(schema.parse({ a: 8 })).toStrictEqual({
      success: false,
      path: { invalid_element: { key: "a", path: { not_undefined: 8 } } },
    });
    vt.expect(schema.parse({})).toStrictEqual({
      success: false,
      path: { not_found: "a" },
    });
  }
});

// https://github.com/type-challenges/type-challenges/blob/194e6f075a47b5927a9cc50bcf709076fa1cc2c1/utils/index.d.ts
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;
type Expect<T extends true> = T;

() => {
  {
    const spec = [T.sObject({ a: T.sNull() }), T.sString()];
    const schema = T.sUnion(spec);
    type _ = Expect<Equal<T.TOut<typeof schema>, { a: null } | string>>;
  }
  {
    const schema = T.sTuple([T.sNumber(), T.sString()]);
    type _ = Expect<Equal<T.TOut<typeof schema>, [number, string]>>;
  }
  {
    const schema = T.sObject({
      a: T.sNull(),
      b: T.sUndefined(),
      c: T.sBoolean(),
      d: T.sUnion([T.sNull(), T.sTuple([T.sArray(T.sString())])]),
    });
    type _ = Expect<
      Equal<
        T.TOut<typeof schema>,
        { a: null; b: undefined; c: boolean; d: null | [string[]] }
      >
    >;
  }
};
