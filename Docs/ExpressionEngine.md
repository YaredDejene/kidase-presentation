Below is a **concise but complete design document** for **Option A**.
It is written as an implementation plan you can actually follow in a React + TypeScript app.

---

# Rule Engine Design Document (Option A)

## 1. Goals

* Define rules using a **Mongo like JSON DSL**
* Support **dynamic runtime values** using `@` prefix
* Support **computed expressions** like date and number differences
* Keep evaluation **deterministic and safe**
* Be fully **frontend compatible** and **serializable**

Non goals:

* No string parsing
* No `eval`
* No backend dependency

---

## 2. High level architecture

```
Rule (DSL)
   ↓
Normalizer
   ↓
Internal AST
   ↓
Resolver (dynamic values)
   ↓
Evaluator
   ↓
boolean result
```

Each step is isolated and testable.

---

## 3. Rule DSL (author facing)

### 3.1 Logical operators

```ts
$and: Rule[]
$or: Rule[]
$not: Rule
```

Example:

```ts
{
  $and: [
    { "@user.age": { $gte: 18 } },
    { "@user.country": { $in: ["US", "CA"] } }
  ]
}
```

---

### 3.2 Comparison operators

| Operator | Meaning          |
| -------- | ---------------- |
| `$eq`    | equal            |
| `$ne`    | not equal        |
| `$gt`    | greater than     |
| `$gte`   | greater or equal |
| `$lt`    | less than        |
| `$lte`   | less or equal    |
| `$in`    | in array         |

Example:

```ts
{ "@user.age": { $gte: 18 } }
```

---

### 3.3 Dynamic values

#### Syntax

* Any string starting with `@` is a **runtime reference**

Examples:

```ts
"@user.age"
"@order.startDate"
"@now"
```

Static values stay unchanged.

---

### 3.4 Computed expressions

#### `$diff` operator

Used to compute difference between two values.

Syntax:

```ts
{
  $diff: [left, right, unit?],
  $eq: number
}
```

Examples:

```ts
{
  $diff: ["@order.startDate", "@now", "days"],
  $eq: 9
}
```

Units:

* `"days"`
* `"hours"`
* `"minutes"`
* `"seconds"`
* `"ms"`

Defaults:

* unit defaults to `"days"`

---

## 4. Rule object structure

```ts
interface RuleDefinition {
  id: string
  when: Rule
  then: RuleOutcome
}
```

Example:

```ts
{
  id: "expiry_warning",
  when: {
    $and: [
      { "@user.age": { $gte: 18 } },
      {
        $diff: ["@order.startDate", "@now", "days"],
        $eq: 9
      }
    ]
  },
  then: {
    action: "SHOW_TEXT",
    key: "expiry_message"
  }
}
```

---

## 5. Normalization phase

### Purpose

* Convert compact DSL into strict internal AST
* Replace implicit forms with explicit ones

### Input

DSL rule

### Output

AST nodes only

Example normalization:

```ts
"@user.age" → { type: "REF", path: "user.age" }
```

```ts
{ "@user.age": { $gte: 18 } }
→
{
  type: "COMPARE",
  left: { type: "REF", path: "user.age" },
  operator: "GTE",
  right: { type: "VALUE", value: 18 }
}
```

---

## 6. Internal AST (engine facing)

### Node types

```ts
type Node =
  | LogicalNode
  | CompareNode
  | DiffNode
  | ValueNode
  | RefNode
```

---

### Logical node

```ts
{
  type: "AND" | "OR" | "NOT"
  children: Node[]
}
```

---

### Comparison node

```ts
{
  type: "COMPARE"
  operator: "EQ" | "GTE" | "LTE" | ...
  left: Node
  right: Node
}
```

---

### Diff node

```ts
{
  type: "DIFF"
  left: Node
  right: Node
  unit: "days" | "hours" | "minutes" | "seconds" | "ms"
}
```

---

### Value node

```ts
{
  type: "VALUE"
  value: unknown
}
```

---

### Ref node

```ts
{
  type: "REF"
  path: string
}
```

---

## 7. Resolution phase

### Purpose

Replace `REF` nodes with concrete values.

### Input

* AST
* Context object

Example context:

```ts
{
  user: { age: 21 },
  order: { startDate: "2026-01-01" },
  now: "2026-01-10"
}
```

### Output

AST with only VALUE nodes

Rules:

1. Missing path → `undefined`
2. Resolution happens once
3. No side effects

---

## 8. Evaluation phase

### Evaluation strategy

* Recursive evaluation
* Short circuit logical nodes

### Examples

Logical:

* AND stops on first false
* OR stops on first true

Comparison:

* Strict comparison by operator
* Type mismatches return false

Diff:

* Date values parsed once
* Numeric diff supported

---

## 9. Rule selection strategy

### Options

* First match wins
* All matching rules
* Priority based

Example:

```ts
rules.find(rule => evaluate(rule.when, context))
```

---

## 10. Error handling

| Case              | Behavior              |
| ----------------- | --------------------- |
| Missing ref       | resolves to undefined |
| Invalid operator  | validation error      |
| Invalid diff unit | validation error      |
| Type mismatch     | condition false       |

Validation happens **before runtime**.

---

## 11. Extensibility

Add new features by:

* Adding new operator
* Adding new AST node
* Updating normalizer only

Evaluator stays stable.

---

## 12. Testing strategy

* Unit test normalizer
* Unit test resolver
* Unit test evaluator
* Snapshot test DSL to AST

---

## 13. Why this design works

* Simple authoring syntax
* Safe execution
* Fully serializable
* Strong TypeScript support
* Easy to debug

---


## 14. Implementation
Example rule:

const rule = {
  $and: [
    { "@user.age": { $gte: 18 } },
    {
      $diff: ["@order.amount", "@previous.amount"],
      $eq: 9
    },
    {
      $diff: ["@order.startDate", "@now", "days"],
      $eq: 9
    }
  ]
}


Internal AST types:
type Node =
  | LogicalNode
  | CompareNode
  | DiffNode
  | ValueNode
  | RefNode

interface LogicalNode {
  type: "AND" | "OR" | "NOT"
  children: Node[]
}

interface CompareNode {
  type: "COMPARE"
  operator: "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "IN"
  left: Node
  right: Node
}

interface DiffNode {
  type: "DIFF"
  left: Node
  right: Node
  unit: "days" | "hours" | "minutes" | "seconds" | "ms" | "number"
}

interface ValueNode {
  type: "VALUE"
  value: any
}

interface RefNode {
  type: "REF"
  path: string
}

Normalizer (DSL → AST):

function normalize(rule: any): Node {
  if (rule.$and) {
    return {
      type: "AND",
      children: rule.$and.map(normalize)
    }
  }

  if (rule.$or) {
    return {
      type: "OR",
      children: rule.$or.map(normalize)
    }
  }

  if (rule.$not) {
    return {
      type: "NOT",
      children: [normalize(rule.$not)]
    }
  }

  if (rule.$diff) {
    const [left, right, unit] = rule.$diff
    const compareOp = Object.keys(rule).find(k => k.startsWith("$") && k !== "$diff")

    if (!compareOp) {
      throw new Error("Diff must be followed by comparison operator")
    }

    return {
      type: "COMPARE",
      operator: normalizeOperator(compareOp),
      left: {
        type: "DIFF",
        left: normalizeValue(left),
        right: normalizeValue(right),
        unit: unit ?? "number"
      },
      right: normalizeValue(rule[compareOp])
    }
  }

  const field = Object.keys(rule)[0]
  const condition = rule[field]

  return {
    type: "COMPARE",
    operator: normalizeOperator(Object.keys(condition)[0]),
    left: normalizeValue(field),
    right: normalizeValue(condition[Object.keys(condition)[0]])
  }
}

function normalizeValue(value: any): Node {
  if (typeof value === "string" && value.startsWith("@")) {
    return {
      type: "REF",
      path: value.slice(1)
    }
  }

  if (typeof value === "object" && value !== null) {
    return normalize(value)
  }

  return {
    type: "VALUE",
    value
  }
}

function normalizeOperator(op: string): CompareNode["operator"] {
  const map: Record<string, CompareNode["operator"]> = {
    $eq: "EQ",
    $ne: "NE",
    $gt: "GT",
    $gte: "GTE",
    $lt: "LT",
    $lte: "LTE",
    $in: "IN"
  }

  const operator = map[op]
  if (!operator) throw new Error(`Unsupported operator ${op}`)
  return operator
}

Resolver (REF → VALUE):

function resolve(node: Node, context: any): Node {
  switch (node.type) {
    case "REF":
      return {
        type: "VALUE",
        value: getByPath(context, node.path)
      }

    case "AND":
    case "OR":
    case "NOT":
      return {
        ...node,
        children: node.children.map(child => resolve(child, context))
      }

    case "COMPARE":
      return {
        ...node,
        left: resolve(node.left, context),
        right: resolve(node.right, context)
      }

    case "DIFF":
      return {
        ...node,
        left: resolve(node.left, context),
        right: resolve(node.right, context)
      }

    case "VALUE":
      return node
  }
}

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc?.[key], obj)
}


Evaluator:
function evaluate(node: Node): boolean | number {
  switch (node.type) {
    case "AND":
      return node.children.every(evaluate)

    case "OR":
      return node.children.some(evaluate)

    case "NOT":
      return !evaluate(node.children[0])

    case "COMPARE":
      return compare(
        evaluateValue(node.left),
        evaluateValue(node.right),
        node.operator
      )

    case "DIFF":
      return diff(
        evaluateValue(node.left),
        evaluateValue(node.right),
        node.unit
      )

    case "VALUE":
      return node.value
  }
}

function evaluateValue(node: Node): any {
  if (node.type === "DIFF") {
    return diff(
      evaluateValue(node.left),
      evaluateValue(node.right),
      node.unit
    )
  }

  if (node.type === "VALUE") return node.value

  throw new Error("Invalid value node")
}

Diff implementation (dates + numbers):

function diff(left: any, right: any, unit: DiffNode["unit"]): number {
  if (left == null || right == null) return NaN

  if (unit === "number") {
    if (typeof left !== "number" || typeof right !== "number") return NaN
    return Math.abs(left - right)
  }

  const l = new Date(left).getTime()
  const r = new Date(right).getTime()

  const ms = Math.abs(l - r)

  switch (unit) {
    case "days":
      return Math.floor(ms / (1000 * 60 * 60 * 24))
    case "hours":
      return Math.floor(ms / (1000 * 60 * 60))
    case "minutes":
      return Math.floor(ms / (1000 * 60))
    case "seconds":
      return Math.floor(ms / 1000)
    case "ms":
      return ms
  }
}


Comparator:

function compare(left: any, right: any, op: CompareNode["operator"]): boolean {
  switch (op) {
    case "EQ":
      return left === right
    case "NE":
      return left !== right
    case "GT":
      return left > right
    case "GTE":
      return left >= right
    case "LT":
      return left < right
    case "LTE":
      return left <= right
    case "IN":
      return Array.isArray(right) && right.includes(left)
  }
}


Full execution pipeline:

function evaluateRule(ruleDsl: any, context: any): boolean {
  const ast = normalize(ruleDsl)
  const resolvedAst = resolve(ast, context)
  return Boolean(evaluate(resolvedAst))
}


const context = {
  user: { age: 21 },
  order: {
    amount: 109,
    startDate: "2026-01-01"
  },
  previous: { amount: 100 },
  now: "2026-01-10"
}

evaluateRule(rule, context)
// true


What you now have

    Mongo like DSL

    Dynamic @ values

    Diff for numbers and dates

    Safe evaluation

    Fully frontend compatible

    Extensible engine


Next logical steps:

    Add validation layer

    Add caching and memoization (optional)

    Add rule priority and actions (optional)