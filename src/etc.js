// GraphQL constants
const KIND_SCALAR = 'SCALAR'
const KIND_OBJECT = 'OBJECT'
const KIND_INTERFACE = 'INTERFACE'
const KIND_UNION = 'UNION'
const KIND_ENUM = 'ENUM'
const KIND_INPUT_OBJECT = 'INPUT_OBJECT'
const KIND_LIST = 'LIST'
const KIND_NON_NULL = 'NON_NULL'

// An Object containing all the GraphQL Kind values you may encounter.
export const KINDS = Object.freeze({
  SCALAR: KIND_SCALAR,
  OBJECT: KIND_OBJECT,
  INTERFACE: KIND_INTERFACE,
  UNION: KIND_UNION,
  ENUM: KIND_ENUM,
  INPUT_OBJECT: KIND_INPUT_OBJECT,
  LIST: KIND_LIST,
  NON_NULL: KIND_NON_NULL,
})

// A function that compares 2 types and determines if they have the same Kind and Name.
export function typesAreSame (typeA, typeB) {
  return typeA.kind === typeB.kind && typeA.name === typeB.name
}
