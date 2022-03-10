<a href="https://www.useanvil.com"><img src="/static/anvil.png" width="50"></a>

# Microfiber - A.K.A. GraphQL Introspection Tools

[![npm][npm]][npm-url]
[![downloads][npm-downloads]][npm-url]

A library to query and manipulate GraphQL Introspection Query results in some useful ways. What ways you ask?

How about:
- Digging through your Introspection Query Results for a specific Query, Mutation, Type, Field, Argument or Subscription.
- Removing a specific Query, Mutation, Type, Field/InputField, Argument or Subscription from your Introspection Query Results.
- Removing Queries, Mutations, Fields/InputFields or Arguments that refer to Type that does not exist in - or has been removed from - your Introspection Query Results.

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
import introspectionQueryResults from 'path/to/introspection-query-results.js'

const microfiber = new Microfiber(introspectionQueryResults)

// ...do some things to your schema

const cleanedIntrospectonQueryResults = microfiber.getResponse()

// ...do something with your cleaned Introspection Query Results.
```

This is a global installation, but you can also either:
+ Clone this repository
+ Add `spectaql` as a dependency to an existing project.

## Usage



[npm]: https://badge.fury.io/js/microfiber.svg
[npm-downloads]: https://img.shields.io/npm/dw/microfiber
[npm-url]: https://www.npmjs.com/package/microfiber