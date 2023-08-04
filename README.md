<a href="https://www.useanvil.com"><img src="/static/anvil.png" width="50"></a>

# Microfiber - A.K.A. GraphQL Introspection Tools

[![npm][npm]][npm-url]
[![downloads][npm-downloads]][npm-url]

<a href="https://www.useanvil.com/docs"><img src="/static/microfiber.png" width="500"></a>

A library to query and manipulate GraphQL Introspection Query results in some useful ways. What ways you ask?

How about:
- Digging through your Introspection Query Results for a specific Query, Mutation, Type, Field, Argument or Subscription.
- Removing a specific Query, Mutation, Type, Field/InputField, Argument or Subscription from your Introspection Query Results.
- Removing Queries, Mutations, Fields/InputFields or Arguments that refer to Type that does not exist in - or has been removed from - your Introspection Query Results.

Yay!

It's called `microfiber` because it is heavily used to do the cleaning and manipulation in [SpectaQL][spectaql]...it *cleans* the *spectacles*, get it?!

But, we also wanted to have a more intuitive, literal name so that people could find it. Hence it's also known as `@anvilco/graphql-introspection-tools`.

---

**Repository sponsored by [Anvil](www.useanvil.com/developers)**

![Horizontal Lockupblack](https://user-images.githubusercontent.com/293079/169453889-ae211c6c-7634-4ccd-8ca9-8970c2621b6f.png#gh-light-mode-only)
![Horizontal Lockup copywhite](https://user-images.githubusercontent.com/293079/169453892-895f637b-4633-4a14-b997-960c9e17579b.png#gh-dark-mode-only)

Anvil provides easy APIs for all things paperwork.

1. [PDF filling API](https://www.useanvil.com/products/pdf-filling-api/) - fill out a PDF template with a web request and structured JSON data.
2. [PDF generation API](https://www.useanvil.com/products/pdf-generation-api/) - send markdown or HTML and Anvil will render it to a PDF.
3. [Etch e-sign with API](https://www.useanvil.com/products/etch/) - customizable, embeddable, e-signature platform with an API to control the signing process end-to-end.
4. [Anvil Workflows (w/ API)](https://www.useanvil.com/products/workflows/) - Webforms + PDF + e-sign with a powerful no-code builder. Easily collect structured data, generate PDFs, and request signatures.

Learn more on our [Anvil developer page](https://www.useanvil.com/developers/).

---

## Getting Started

1. Install `microfiber`  
```sh
npm install microfiber
# OR
yarn add microfiber
```

2. Clean your GraphQL Introspection Query Results
```node
import { Microfiber } from 'microfiber'

const introspectionQueryResults = {...}

const microfiber = new Microfiber(introspectionQueryResults)

// ...do some things to your schema with `microfiber`

const cleanedIntrospectonQueryResults = microfiber.getResponse()

// ...do something with your cleaned Introspection Query Results.
```

## Usage

### class Microfiber

Most of the useful stuff in this library is done through creating a new Microfiber class instance with your Introspection Query Results, and querying or manipulating it via that instance. Here are most of the interesting bits to know about class behavior.

---
#### constructor
```node
const introspectionQueryResponse = {...}
// Here are the publicly supported options and their sane defaults:
const options = {
  // Some GraphQL implementations have non-standard Query, Mutation and/or Subscription
  // type names. This option will fix them if they're messed up in the Introspection Query
  // Results
  fixQueryAndMutationAndSubscriptionTypes: true,

  // Remove Types that are not referenced anywhere by anything
  removeUnusedTypes: true,

  // Remove things whose Types are not found due to being removed
  removeFieldsWithMissingTypes: true,
  removeArgsWithMissingTypes: true,
  removeInputFieldsWithMissingTypes: true,
  removePossibleTypesOfMissingTypes: true,

  // Remove all the types and things that are unreferenced immediately?
  cleanupSchemaImmediately: true,  
}

const microfiber = new Microfiber(introspectionQueryResponse, options)
```
---
#### cleanSchema
Clean up the schema by removing:
- Fields or Input Fields whose Type does not exist in the schema.
- Args whose Type does not exist in the schema.
- Possible Types in a Union that do not exist in the schema.
- Queries or Mutations whose return Type does not exist in the schema.

This method is usually called after altering the schema in any way so as to not leave any dangling/orphaned things around the schema.
```node
microfiber.cleanSchema()
```
---
#### getResponse
Get out the Introspection Query Result that you have manipulated with Microfiber as an Object.
```node
const cleanedResponse = microfiber.getResponse()
```
---
#### getAllTypes
Get all the Types from your schema as an Array of Objects. Supported options and their sane defaults are shown.
```node
const allTypes = microfiber.getAllTypes({
  // Include reserved GraphQL types?
  includeReserved: false,
  // Include the Query type?
  includeQuery: false,
  // Include the Mutation type?
  includeMutation: false,
  // Include the Subscription type?
  includeSubscription: false,
} = {})
```
---
#### getType
Get a specific Type from your schema. Supported params and their sane defaults are shown.
```node
const type = microfiber.getType({ kind: 'OBJECT', name })
```
---
#### getDirectives
Get all the Directives from your schema.
```node
const directives = microfiber.getDirectives()
```
---
#### getDirective
Get a specific Directive from your schema. Supported params and their sane defaults are shown.
```node
const directive = microfiber.getDirective({ name })
```
---
#### getQueryType
Get the Query Type from your schema.
```node
const queryType = microfiber.getQueryType()
```
---
#### getQuery
Get a specific Query from your schema.
```node
const query = microfiber.getQuery({ name })
```
---
#### getMutationType
Get the Mutation Type from your schema.
```node
const mutationType = microfiber.getMutationType()
```
---
#### getMutation
Get a specific Mutation from your schema.
```node
const mutation = microfiber.getMutation({ name })
```
---
#### getSubscriptionType
Get the Subscription Type from your schema.
```node
const subscriptionType = microfiber.getSubscription()
```
---
#### getSubscription
Get a specific Subscription from your schema.
```node
const subscription = microfiber.getSubscription({ name })
```
---
#### getField
Get a specific Field from your schema. Supported params and their sane defaults are shown.
```node
const field = microfiber.getField({ typeKind: 'OBJECT', typeName, fieldName })
```
---
#### getInterfaceField
Get a specific Field from an Interface in your schema. A convenience wrapper around `getField({ typeKind: 'INTERFACE', ...})`
```node
const interfaceField = microfiber.getInterfaceField({ typeName, fieldName })
```
---
#### getEnumValue
Get a specific EnumValue from your schema. A convenience wrapper around `getField({ typeKind: 'ENUM', ...})`
```node
const inputField = microfiber.getEnumValue({ typeName, fieldName })
```
---
#### getInputField
Get a specific InputField from your schema. A convenience wrapper around `getField({ typeKind: 'INPUT_OBJECT', ...})`
```node
const inputField = microfiber.getInputField({ typeName, fieldName })
```
---
#### getArg
Get a specific Arg from your schema. Supported params and their sane defaults are shown.
```node
const arg = microfiber.getArg({ typeKind: 'OBJECT', typeName, fieldName, argName })
```
---
#### getDirectiveArg
Get a specific Arg from a specifig Directive in your schema. Supported params and their sane defaults are shown.
```node
const directiveArg = microfiber.getDirectiveArg({ directiveName, argName })
```
---
#### removeDirective
Get a specific Directive from your schema. Supported params and their sane defaults are shown.
```node
const directiveArg = microfiber.removeDirective({
  name,
  // Clean up the schema afterwards?
  cleanup = true,
})
```
---
#### removeType
Remove a Type from your schema, and optionally the references to that Type elsewhere in your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeType({
  kind: 'OBJECT',
  name,
  // Clean up the schema afterwards?
  cleanup: true,
  // Remove occurances of this Type from other places?
  removeFieldsOfType: constructorOptions.removeFieldsWithMissingTypes,
  removeInputFieldsOfType: constructorOptions.removeInputFieldsWithMissingTypes,
  removePossibleTypesOfType: constructorOptions.removePossibleTypesOfMissingTypes,
  removeArgsOfType: constructorOptions.removeArgsWithMissingTypes,
})
```
---
#### removeField
Remove a specific Field from a specific Type in your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeField({
  typeKind: 'OBJECT',
  typeName,
  fieldName,
  // Clean up the schema afterwards?
  cleanup: true,
})
```
---
#### removeInputField
Remove a specific Input Field from a specific Input Object in your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeInputField({
  typeName,
  fieldName,
  // Clean up the schema afterwards?
  cleanup: true,
})
```
---
#### removeArg
Remove a specific Arg from a specific Field or Input Field in your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeArg({
  typeKind,
  typeName,
  fieldName,
  argName,
  // Clean up the schema afterwards?
  cleanup: true,
})
```
---
#### removeEnumValue
Remove a specifc Enum value from an Enum Type in your schema. Supported params are shown.
```node
microfiber.removeEnumValue({
  // The name of the Enum Type
  name,
  // The Enum value you want to remove
  value,
})
```
---
#### removePossibleType
Remove a Possible Type from a specific Union Type in your schema. Supported params and sane defaults are shown.
```node
microfiber.removePossibleType({
  // The name of the Union Type
  typeName,
  // The Kind of the possible Type you want to remove
  possibleTypeKind,
  // The name of the possible Type you want to remove
  possibleTypeName,
  // Clean up the schema afterwards?
  cleanup: true,
})
```
---
#### removeQuery
Remove a specific Query from your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeQuery({
  name,
  // Clean up the schema afterwards?
  cleanup: true,
})
```
---
#### removeMutation
Remove a specific Mutation from your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeMutation({
  name,
  // Clean up the schema afterwards?
  cleanup: true,
})
```
---
#### removeSubscription
Remove a specific Subscription from  your schema. Supported params and their sane defaults are shown.
```node
microfiber.removeSubscription({
  name,
  // Clean up the schema afterwards?
  cleanup: true,
})
```

### Other exports from this library
There are some other exports from this library, not just the `Microfiber` class. 

---
#### KINDS
An Object containing all the GraphQL Kind values you may encounter.
```node
import { KINDS } from 'microfiber'

console.log(KINDS)

// {
//   SCALAR: 'SCALAR',
//   OBJECT: 'OBJECT',
//   INTERFACE: 'INTERFACE',
//   UNION: 'UNION',
//   ENUM: 'ENUM',
//   INPUT_OBJECT: 'INPUT_OBJECT',
//   LIST: 'LIST',
//   NON_NULL: 'NON_NULL'
// }
```
---
#### typesAreSame
A function that compares 2 types and determines if they have the same Kind and Name.
```node
import { typesAreSame } from 'microfiber'

const typeA = { kind: 'OBJECT', name: 'Foo' }
const typeB = { kind: 'OBJECT', name: 'Bar' }

typesAreSame(typeA, typeB) // false
typesAreSame(typeA, typeA) // true
```
---
#### digUnderlyingType
A function that digs through any Non-Null and List nesting and returns the underlying Type.
```node
import { digUnderlyingType } from 'microfiber'

const nonNullableString = {
  name: null,
  kind: 'NON_NULL',
  ofType: {
    name: null,
    kind: 'LIST',
    ofType: {
      name: 'String',
      kind: 'SCALAR',
    }
  }
}

digUnderlyingType(nonNullableString) // { name: 'String', kind: 'SCALAR' }
```
---
#### isReservedType
A function that returns a Boolean indicating whether a Type is special GraphQL reserved Type.
```node
import { isReservedType } from 'microfiber'

const myType = { name: 'Foo', ... }
const reservedType = { name: '__Foo', ... }

isReservedType(myType) // false
isReservedType(reservedType) // true
```

[npm]: https://badge.fury.io/js/microfiber.svg
[npm-downloads]: https://img.shields.io/npm/dw/microfiber
[npm-url]: https://www.npmjs.com/package/microfiber
[spectaql]: https://github.com/anvilco/spectaql
