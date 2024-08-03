import * as vt from "vitest";

import * as T from "./index.js";

vt.test("T.$record", () => {
  {
    const validator = T.$record(T.$opaque("Id", T.$string()), T.$number());
    vt.expect(T.parse(validator, { a: 1 })).toStrictEqual({
      success: true,
      value: { a: 1 },
    });
    vt.expect(T.parse(validator, { a: "a" })).toStrictEqual({
      success: false,
      path: { invalid_element_value: { key: "a", path: { not_number: "a" } } },
    });
    vt.expect(T.parse(validator, null)).toStrictEqual({
      success: false,
      path: { not_object: null },
    });
  }
});

vt.test("T.$typeGuard", () => {
  const validator = T.$typeGuard(
    (x: unknown): x is number => typeof x === "number",
  );
  vt.expect(T.parse(validator, 1)).toStrictEqual({ success: true, value: 1 });
  vt.expect(T.parse(validator, "1")).toStrictEqual({
    success: false,
    path: { invalid_value: "1" },
  });
});

vt.test("T.$union", () => {
  const validator = T.$union(T.$required({ a: T.$null() }), T.$string());
  vt.expect(T.parse(validator, "ok")).toStrictEqual({
    success: true,
    value: "ok",
  });
  vt.expect(T.parse(validator, { a: null })).toStrictEqual({
    success: true,
    value: { a: null },
  });
  vt.expect(T.parse(validator, { a: 9 })).toStrictEqual({
    success: false,
    path: {
      not_union: [
        { invalid_element_value: { key: "a", path: { not_null: 9 } } },
        { not_string: { a: 9 } },
      ],
    },
  });
});

vt.test("T.$array", () => {
  const validator = T.$array(T.$union(T.$string(), T.$null()));
  vt.expect(T.parse(validator, ["a", "b"])).toStrictEqual({
    success: true,
    value: ["a", "b"],
  });
  vt.expect(T.parse(validator, ["a", null])).toStrictEqual({
    success: true,
    value: ["a", null],
  });
  vt.expect(T.parse(validator, ["a", 1])).toStrictEqual({
    success: false,
    path: {
      invalid_element_value: {
        key: 1,
        path: { not_union: [{ not_string: 1 }, { not_null: 1 }] },
      },
    },
  });
  vt.expect(T.parse(validator, { a: 1 })).toStrictEqual({
    success: false,
    path: { not_array: { a: 1 } },
  });
});

vt.test("T.$tuple", () => {
  const validator = T.$tuple([T.$null(), T.$string(), T.$literal("literal")]);
  vt.expect(T.parse(validator, [null, "a", "literal"])).toStrictEqual({
    success: true,
    value: [null, "a", "literal"],
  });
  vt.expect(T.parse(validator, [null, 1, "literal"])).toStrictEqual({
    success: false,
    path: { invalid_element_value: { key: 1, path: { not_string: 1 } } },
  });
  vt.expect(T.parse(validator, [null, "a", "LITERAL"])).toStrictEqual({
    success: false,
    path: {
      invalid_element_value: { key: 2, path: { invalid_value: "LITERAL" } },
    },
  });
  vt.expect(T.parse(validator, { a: 1 })).toStrictEqual({
    success: false,
    path: { not_array: { a: 1 } },
  });
});

vt.test("T.$tuple with rest", () => {
  const validator = T.$tuple(
    [T.$null(), T.$string(), T.$literal("literal")],
    T.$boolean(),
  );
  vt.expect(T.parse(validator, [null, "a", "literal"])).toStrictEqual({
    success: true,
    value: [null, "a", "literal"],
  });
  vt.expect(T.parse(validator, [null, "a", "literal", true])).toStrictEqual({
    success: true,
    value: [null, "a", "literal", true],
  });
  vt.expect(
    T.parse(validator, [null, "a", "literal", true, false]),
  ).toStrictEqual({
    success: true,
    value: [null, "a", "literal", true, false],
  });
  vt.expect(T.parse(validator, [null, 1, "literal"])).toStrictEqual({
    success: false,
    path: { invalid_element_value: { key: 1, path: { not_string: 1 } } },
  });
  vt.expect(T.parse(validator, [null, "a", "LITERAL"])).toStrictEqual({
    success: false,
    path: {
      invalid_element_value: { key: 2, path: { invalid_value: "LITERAL" } },
    },
  });
  vt.expect(T.parse(validator, { a: 1 })).toStrictEqual({
    success: false,
    path: { not_array: { a: 1 } },
  });
});

vt.test("T.$opaque", () => {
  {
    const validator = T.$required({
      a: T.$opaque("Id", T.$string()),
      b: T.$string(),
    });
    vt.expect(T.parse(validator, { a: "a", b: "b" })).toStrictEqual({
      success: true,
      value: { a: "a", b: "b" },
    });
  }
});

vt.test("T.$optional", () => {
  {
    const validator = T.$intersection(
      T.$optional({ a: T.$string() }),
      T.$required({ b: T.$number() }),
    );
    vt.expect(T.parse(validator, { a: "a", b: 1 })).toStrictEqual({
      success: true,
      value: { a: "a", b: 1 },
    });
    vt.expect(T.parse(validator, { b: 1 })).toStrictEqual({
      success: true,
      value: { b: 1 },
    });
    vt.expect(T.parse(validator, { a: undefined, b: 1 })).toStrictEqual({
      success: false,
      path: {
        invalid_element_value: { key: "a", path: { not_string: undefined } },
      },
    });
  }
});

vt.test("T.$required", () => {
  {
    const validator = T.$required({
      a: T.$boolean(),
      b: T.$number(),
    });
    vt.expect(T.parse(validator, { a: true, b: 1 })).toStrictEqual({
      success: true,
      value: { a: true, b: 1 },
    });
    vt.expect(T.parse(validator, { a: true, b: "b" })).toStrictEqual({
      success: false,
      path: { invalid_element_value: { key: "b", path: { not_number: "b" } } },
    });
    vt.expect(T.parse(validator, { a: null, b: 1 })).toStrictEqual({
      success: false,
      path: {
        invalid_element_value: { key: "a", path: { not_boolean: null } },
      },
    });
    vt.expect(T.parse(validator, { b: 1 })).toStrictEqual({
      success: false,
      path: { not_found: "a" },
    });
  }
  {
    const validator = T.$required({ a: T.$undefined() });
    vt.expect(T.parse(validator, { a: undefined })).toStrictEqual({
      success: true,
      value: { a: undefined },
    });
    vt.expect(T.parse(validator, { a: 8 })).toStrictEqual({
      success: false,
      path: { invalid_element_value: { key: "a", path: { not_undefined: 8 } } },
    });
    vt.expect(T.parse(validator, {})).toStrictEqual({
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
type MEqual<X, Y> = Equal<T.TMerge<X>, T.TMerge<Y>>;
type BExtends<X, Y> = X extends Y ? (Y extends X ? true : false) : false;
type Check<X, Y> = MEqual<X, Y> extends true ? BExtends<X, Y> : false;
type Expect<T extends true> = T;
type NExpect<T extends false> = T;

() => {
  {
    {
      type _ = NExpect<Equal<{ a?: 1; b?: 2 } & { a: 1 }, { a: 1; b?: 2 }>>;
    }
    {
      type _ = Expect<MEqual<{ a?: 1; b?: 2 } & { a: 1 }, { a: 1; b?: 2 }>>;
    }
    {
      {
        type _ = Expect<Check<{ a?: 1; b?: 2 } & { a: 1 }, { a: 1; b?: 2 }>>;
      }
      {
        type _ = NExpect<Check<{ a?: undefined | string }, { a?: string }>>;
      }
      {
        type _ = Expect<Check<{ a?: string }, { a?: string }>>;
      }
    }
  }
  {
    {
      const validator = T.$readonly(T.$string());
      type _ = Expect<Check<T.$infer<typeof validator>, string>>;
    }
    {
      const validator = T.$intersection(
        T.$required({
          a: T.$string(),
        }),
        T.$readonly(
          T.$required({
            b: T.$string(),
          }),
        ),
        T.$optional({
          c: T.$string(),
        }),
        T.$readonly(
          T.$optional({
            d: T.$string(),
            e: T.$string(),
          }),
        ),
      );
      type _ = Expect<
        Check<
          T.$infer<typeof validator>,
          {
            a: string;
            readonly b: string;
            c?: string;
            readonly d?: string;
            readonly e?: string;
          }
        >
      >;
    }
  }
  {
    {
      const idValidator = T.$opaque("Id", T.$string());
      const validator = T.$readonly(T.$record(idValidator, T.$number()));
      type _ = Expect<
        Check<
          T.$infer<typeof validator>,
          { readonly [_ in T.$infer<typeof idValidator>]: number }
        >
      >;
    }
    {
      const idValidator = T.$opaque("Id", T.$string());
      const validator = T.$record(idValidator, T.$number());
      type _ = Expect<
        Check<
          T.$infer<typeof validator>,
          { [_ in T.$infer<typeof idValidator>]: number }
        >
      >;
    }
    {
      const idValidator = T.$opaque("Id", T.$string());
      const validator = T.$record(idValidator, T.$number());
      type _ = Expect<
        Check<
          T.$infer<typeof validator>,
          { [_ in T.$infer<typeof idValidator>]: number }
        >
      >;
    }
  }
  {
    const validator = T.$literal("abc");
    type _ = Expect<Check<T.$infer<typeof validator>, "abc">>;
  }
  {
    const sid = T.$opaque("Id", T.$string());
    const fn = (x: T.$infer<typeof sid>) => x;
    type _ = NExpect<Check<Parameters<typeof fn>, [string]>>;
  }
  {
    const validator = T.$intersection(
      T.$required({
        a: T.$null(),
        b: T.$undefined(),
      }),
      T.$readonly(
        T.$required({
          f: T.$boolean(),
        }),
      ),
      T.$optional({
        e: T.$boolean(),
      }),
      T.$readonly(
        T.$optional({
          c: T.$boolean(),
          d: T.$boolean(),
          g: T.$union(T.$undefined(), T.$boolean()),
        }),
      ),
    );
    type _ = Expect<
      Check<
        T.$infer<typeof validator>,
        {
          a: null;
          b: undefined;
          readonly c?: boolean;
          readonly d?: boolean;
          e?: boolean;
          readonly f: boolean;
          readonly g?: undefined | boolean;
        }
      >
    >;
  }
  {
    const typeGuard = (x: unknown): x is number => typeof x === "number";
    const validator = T.$typeGuard(typeGuard);
    type _ = Expect<Check<T.$infer<typeof validator>, number>>;
  }
  {
    const validator = T.$tuple([T.$number(), T.$string()]);
    type _ = Expect<
      Check<T.$infer<typeof validator>, readonly [number, string]>
    >;
  }
  {
    const validator = T.$tuple([T.$number(), T.$string()], T.$boolean());
    type _ = Expect<
      Check<T.$infer<typeof validator>, readonly [number, string, ...boolean[]]>
    >;
  }
  {
    const validator = T.$required({
      a: T.$null(),
      b: T.$undefined(),
      c: T.$boolean(),
      d: T.$union(T.$null(), T.$tuple([T.$array(T.$string())])),
    });
    type _ = Expect<
      Check<
        T.$infer<typeof validator>,
        {
          a: null;
          b: undefined;
          c: boolean;
          d: null | readonly [readonly string[]];
        }
      >
    >;
  }
};
