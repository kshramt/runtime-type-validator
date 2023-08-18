
# `@kshramt/runtime-type-validator`

A robust and type-safe runtime data validation library for TypeScript.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Usage](#usage)
   - [Basic Usage](#basic-usage)
   - [Composing Validators](#composing-validators)
   - [Modifiers](#modifiers)
   - [Parsing and Error Reporting](#parsing-and-error-reporting)

## Introduction

`@kshramt/runtime-type-validator` offers a set of tools for runtime data validation, ensuring that data conforms to expected types and structures.

## Installation

Using npm:

```bash
npm install @kshramt/runtime-type-validator
```

## Usage

### Basic Usage

```typescript
import { $string, $number } from "@kshramt/runtime-type-validator";

const usernameValidator = $string();
const ageValidator = $number();
```

### Composing Validators

```typescript
import { $object, $array, $union, $tuple, $literal } from "@kshramt/runtime-type-validator";

const userValidator = $object({
  name: $string(),
  hobbies: $array($string()),
  metadata: $union($string(), $tuple($number(), $literal('info')))
});
```

### Modifiers

```typescript
import { $object, $readonly, $optional, $opaque } from "@kshramt/runtime-type-validator";

const dataValidator = $object({
  readonlyString: $readonly($string()),
  optionalNumber: $optional($number()),
  readonlyOptionalUserId: $readonly($optional($opaque("UserId", $string()))),
})
```

### Parsing and Error Reporting

```typescript
import { parse, $infer } from "@kshramt/runtime-type-validator";

{
  const data = {
    name: "John",
    hobbies: ["reading", "swimming"],
    metadata: [42, "info"],
  }
  if(userValidator(data)){ // Use the validator as a type guard.
    validated: $infer<typeof userValidator> = data;
  }
}

{
  const result = parse(userValidator, {
    name: "John",
    hobbies: ["reading", "swimming"],
    metadata: [42, "information"],  // `"infromation"` does not match `$literal("info")`.
  });

  if (!result.success) {
    console.error("Validation failed:", result.path);
  }
}
```

## API Reference

The following are some of the core functions and types provided by "@kshramt/runtime-type-validator":

- **`$string`, `$number`, `$boolean`, `$null`, `$undefined`**: Basic type validators.
- **`$object`, `$array`, `$tuple`, `$union`, `$literal`**: Composite type validators.
- **`$readonly`, `$optional`, `$opaque`**: Modifiers for creating more specific validators.
- **`$typeGuard`**: Create a validator from a TypeScript type guard.
- **`parse`**: Test a value against a validator and get a detailed error path if validation fails.
