import get from 'lodash.get'
import unset from 'lodash.unset'
import defaults from 'lodash.defaults'

import {
  KINDS,
  typesAreSame,
} from './etc'


// TODO:
//
// interfaces
//
// remove types that have no fields/inputFields/possibleTypes
//
// optimize to only clean if "dirty" and when pulling schema out

const defaultOpts = Object.freeze({
  // Perform an analysis of the schema right away.
  _analyze: true,
  // Perform some normalization of the Introspection Query Results
  _normalize: true,

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
})

// Map some opts to their corresponding removeType params for proper defaulting
const optsToRemoveTypeParamsMap = Object.freeze({
  removeFieldsWithMissingTypes: 'removeFieldsOfType',
  removeArgsWithMissingTypes: 'removeArgsOfType',
  removeInputFieldsWithMissingTypes: 'removeInputFieldsOfType',
  removePossibleTypesOfMissingTypes: 'removePossibleTypesOfType'
})


const kindToFieldPropertyMap = Object.freeze({
  [KINDS.OBJECT]: 'fields',
  [KINDS.INPUT_OBJECT]: 'inputFields',
  // [KINDS.INTERFACE]: 'interfaces',
})

export class Microfiber {
  constructor(response, opts = {}) {
    if (!response) {
      throw new Error('No response provided!')
    }

    opts = defaults({}, opts, defaultOpts)
    this.setOpts(opts)

    // The rest of the initialization can be handled by this public method
    this.setResponse(response)
  }

  setOpts(opts) {
    this.opts = opts || {}
  }

  // Set/change the response on the instance
  setResponse(responseIn) {
    const response = JSON.parse(JSON.stringify(responseIn))

    if (this.opts._normalize) {
      const normalizedResponse = Microfiber.normalizeIntrospectionResponse(response)
      if (normalizedResponse !== response) {
        this._wasNormalized = true
      }
      this.schema = get(normalizedResponse, '__schema')
    } else {
      this.schema = response
    }

    if (this.opts.fixQueryAndMutationAndSubscriptionTypes) {
      this._fixQueryAndMutationAndSubscriptionTypes()
    }

    // OK, time to validate
    this._validate()

    if (this.opts._analyze) {
      this._analyze()
    }

    if (this.opts.cleanupSchemaImmediately) {
      this.cleanSchema()
    }
  }

  // This is how you get OUT what you've put in and manipulated
  getResponse() {
    const clonedResponse = {
      __schema: this._cloneSchema()
    }

    if (this._wasNormalized) {
      return {
        data: clonedResponse,
      }
    }

    return clonedResponse
  }

  static normalizeIntrospectionResponse(response) {
    if (response && response.data) {
      return response.data
    }

    return response
  }

  static digUnderlyingType(type) {
    return digUnderlyingType(type)
  }

  getAllTypes({
    // Include reserved GraphQL types?
    includeReserved = false,
    // Include the Query type?
    includeQuery = false,
    // Include the Mutation type?
    includeMutation = false,
    // Include the Subscription type?
    includeSubscription = false,
  }) {
    const queryType = this.getQueryType()
    const mutationType = this.getMutationType()
    const subscriptionType = this.getSubscriptionType()

    return this.schema.types.filter((type) => {
      if (!includeReserved && isReservedType(type)) {
        return false
      }
      if (queryType && !includeQuery && typesAreSame(type, queryType)) {
        return false
      }
      if (mutationType && !includeMutation && typesAreSame(type, mutationType)) {
        return false
      }

      if (subscriptionType && !includeSubscription && typesAreSame(type, subscriptionType)) {
        return false
      }

      return true
    })
  }

  getType({ kind = KINDS.OBJECT, name }) {
    return this.schema.types[this._getTypeIndex({ kind, name })]
  }

  getQueryType() {
    if (!this.queryTypeName) {
      return false
    }

    return this.getType({ kind: KINDS.OBJECT, name: this.queryTypeName })
  }

  getQuery({ name }) {
    const queryType = this.getQueryType()
    if (!queryType) {
      return false
    }

    return this.getField({ typeKind: queryType.kind, typeName: queryType.name, fieldName: name })
  }

  getMutationType() {
    if (!this.mutationTypeName) {
      return false
    }

    return this.getType({ kind: KINDS.OBJECT, name: this.mutationTypeName })
  }

  getMutation({ name }) {
    const mutationType = this.getMutationType()
    if (!mutationType) {
      return false
    }

    return this.getField({ typeKind: mutationType.kind, typeName: mutationType.name, fieldName: name })
  }

  getSubscriptionType() {
    if (!this.subscriptionTypeName) {
      return false
    }

    return this.getType({ kind: KINDS.OBJECT, name: this.subscriptionTypeName })
  }

  getSubscription({ name }) {
    const subscriptionType = this.getSubscriptionType()
    if (!subscriptionType) {
      return false
    }

    return this.getField({ typeKind: subscriptionType.kind, typeName: subscriptionType.name, fieldName: name })
  }

  getField({ typeKind = KINDS.OBJECT, typeName, fieldName }) {
    const type = this.getType({ kind: typeKind, name: typeName })
    if (!type) {
      return
    }
    const fieldsProperty = kindToFieldPropertyMap[typeKind]
    if (!(fieldsProperty && type[fieldsProperty])) {
      return
    }

    return type[fieldsProperty].find((field) => field.name === fieldName)
  }

  getInputField({ typeName, fieldName }) {
    return this.getField({ typeKind: KINDS.INPUT_OBJECT, typeName, fieldName })
  }

  getArg({ typeKind = KINDS.OBJECT, typeName, fieldName, argName }) {
    const field = this.getField({ typeKind, typeName, fieldName })
    if (!(field && field.args.length)) {
      return
    }

    return field.args.find((arg) => arg.name === argName)
  }

  removeType({
    kind = KINDS.OBJECT,
    name,
    // Clean up the schema afterwards?
    cleanup = true,
    // Remove occurances of this Type from other places?
    removeFieldsOfType,
    removeInputFieldsOfType,
    removePossibleTypesOfType,
    removeArgsOfType,
  }) {
    const typeKey = buildKey({ kind, name })
    if (!Object.prototype.hasOwnProperty.call(this.typeToIndexMap, typeKey)) {
      return false
    }
    const typeIndex = this.typeToIndexMap[typeKey]
    if (isUndef(typeIndex)) {
      return false
    }

    // Create an object of some of the opts, but mapped to keys that match the params
    // of this method. They will then be used as the default value for the params
    // so that constructor opts will be the default, but they can be overridden in
    // the call.
    const mappedOpts = mapProps({ props: this.opts, map: optsToRemoveTypeParamsMap })
    const mergedOpts = defaults(
      {
        removeFieldsOfType,
        removeInputFieldsOfType,
        removePossibleTypesOfType,
        removeArgsOfType,
      },
      mappedOpts,
    )

    // If we are going to clean up afterwards, then the others should not have to
    const shouldOthersClean = !cleanup

    const originalSchema = this._cloneSchema()

    try {
      delete this.schema.types[typeIndex]
      delete this.typeToIndexMap[typeKey]

      if (mergedOpts.removeArgsOfType) {
        this._removeArgumentsOfType({ kind, name, cleanup: shouldOthersClean })
      }

      if (mergedOpts.removeFieldsOfType) {
        this._removeFieldsOfType({ kind, name, cleanup: shouldOthersClean })
      }

      if (mergedOpts.removeInputFieldsOfType) {
        this._removeInputFieldsOfType({ kind, name, cleanup: shouldOthersClean })
      }

      // AKA Unions
      if (mergedOpts.removePossibleTypesOfType) {
        this._removePossibleTypesOfType({ kind, name, cleanup: shouldOthersClean })
      }

      if (cleanup) {
        this.cleanSchema()
      }

      return true
    } catch (err) {
      this.schema = originalSchema
      throw err
    }
  }

  removeField({
    typeKind = KINDS.OBJECT,
    typeName,
    fieldName,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    const type = this.getType({ kind: typeKind, name: typeName })
    if (!type) {
      return false
    }

    const fieldsProperty = kindToFieldPropertyMap[typeKind]
    if (!(fieldsProperty && type[fieldsProperty])) {
      return false
    }

    // TODO: build a map for the locations of fields on types?
    type[fieldsProperty] = type[fieldsProperty].filter((field) => field.name !== fieldName)

    if (cleanup) {
      this.cleanSchema()
    }
  }

  removeInputField({
    typeName,
    fieldName,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    return this.removeField({ typeKind: KINDS.INPUT_OBJECT, typeName, fieldName, cleanup })
  }

  removeArg({
    typeKind,
    typeName,
    fieldName,
    argName,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    const field = this.getField({ typeKind, typeName, fieldName })
    // field.args should alwys be an array, never null
    if (!field) {
      return false
    }

    // TODO: build a map for the locations of args on fields?
    field.args = field.args.filter((arg) => arg.name !== argName)

    if (cleanup) {
      this.cleanSchema()
    }
  }

  // Remove just a single possible value for an Enum, but not the whole Enum
  removeEnumValue({
    // The name of the Enum Type
    name,
    // The Enum value you want to remove
    value,
  }) {
    const type = this.getType({ kind: KINDS.ENUM, name })
    if (!(type && type.enumValues)) {
      return false
    }

    type.enumValues = type.enumValues.filter((enumValue) => enumValue.name !== value)
  }

  removePossibleType({
    // The name of the Union Type
    typeName,
    // The Kind of the possible Type you want to remove
    possibleTypeKind,
    // The name of the possible Type you want to remove
    possibleTypeName,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    const type = this.getType({ kind: KINDS.UNION, name: typeName })
    if (!(type && type.possibleTypes)) {
      return false
    }

    type.possibleTypes = type.possibleTypes.filter((possibleType) => possibleType.type !== possibleTypeKind && possibleType.name !== possibleTypeName)
    if (cleanup) {
      this.cleanSchema()
    }
  }

  removeQuery({
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    if (!this.queryTypeName) {
      return false
    }

    this.removeField({ typeKind: KINDS.OBJECT, typeName: this.queryTypeName, fieldName: name, cleanup })
  }

  removeMutation({
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    if (!this.mutationTypeName) {
      return false
    }

    this.removeField({ typeKind: KINDS.OBJECT, typeName: this.mutationTypeName, fieldName: name, cleanup })
  }

  removeSubscription({
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    if (!this.subscriptionTypeName) {
      return false
    }

    this.removeField({ typeKind: KINDS.OBJECT, typeName: this.subscriptionTypeName, fieldName: name, cleanup })
  }

  // Removes all the undefined gaps created by various removals
  cleanSchema() {
    // Used to compare the schema before and after it was cleaned
    const schemaToStart = JSON.stringify(this.schema)
    const typesEncountered = new Set()
    const types = []

    // The Query, Mutation and Subscription Types should never be removed due to not being referenced
    // by anything
    if (this.queryTypeName) {
      typesEncountered.add(buildKey({ kind: KINDS.OBJECT, name: this.queryTypeName }))
    }
    if (this.mutationTypeName) {
      typesEncountered.add(buildKey({ kind: KINDS.OBJECT, name: this.mutationTypeName }))
    }
    if (this.subscriptionTypeName) {
      typesEncountered.add(buildKey({ kind: KINDS.OBJECT, name: this.subscriptionTypeName }))
    }

    for (const type of this.schema.types) {
      if (!type) {
        continue
      }

      types.push(type)

      const fields = []
      for (const field of (type.fields || [])) {
        if (isUndef(field)) {
          continue
        }

        const fieldType = digUnderlyingType(field.type)
        // Don't add it if its return type does not exist
        if (!this._hasType(fieldType)) {
          continue
        }

        // Keep track of this so we know what we can remove
        typesEncountered.add(buildKey(fieldType))

        const args = []
        for (const arg of (field.args || [])) {
          if (isUndef(arg)) {
            continue
          }

          const argType = digUnderlyingType(arg.type)
          // Don't add it if its return type does not exist
          if (!this._hasType(argType)) {
            continue
          }

          // Keep track of this so we know what we can remove
          typesEncountered.add(buildKey(argType))

          args.push(arg)
        }

        // Args will always be an array. Possible empty, but never null
        field.args = args
        fields.push(field)
      }

      // Fields will be null rather than empty array if no fields
      type.fields = fields.length ? fields : null

      const inputFields = []
      // Don't add it in if it's undefined, or the type is gone
      for (const inputField of (type.inputFields || [])) {
        if (isUndef(inputField)) {
          continue
        }

        const inputFieldType = digUnderlyingType(inputField.type)
        // Don't add it if its return type does not exist
        if (!this._hasType(inputFieldType)) {
          continue
        }

        // Keep track of this so we know what we can remove
        typesEncountered.add(buildKey(inputFieldType))

        inputFields.push(inputField)
      }

      // InputFields will be null rather than empty array if no inputFields
      type.inputFields = inputFields.length ? inputFields : null

      const possibleTypes = []
      for (const possibleType of (type.possibleTypes || [])) {
        if (isUndef(possibleType)) {
          continue
        }

        // possibleTypes array entries have no envelope for the type
        // so do not do possibleType.type here
        const possibleTypeType = digUnderlyingType(possibleType)
        // Don't add it if its return type does not exist
        if (!this._hasType(possibleTypeType)) {
          continue
        }

        // Keep track of this so we know what we can remove
        typesEncountered.add(buildKey(possibleTypeType))

        possibleTypes.push(possibleType)
      }

      // PossibleTypes will be null rather than emptry array if no possibleTypes
      type.possibleTypes = possibleTypes.length ? possibleTypes : null
    }

    // Only include Types that we encountered - if the options say to do so
    const possiblyFilteredTypes = this.opts.removeUnusedTypes ? types.filter((type) => isReservedType(type) || typesEncountered.has(buildKey(type))) : types

    // Replace the Schema
    this.schema = {
      ...this.schema,
      types: possiblyFilteredTypes,
    }

    // Need to re-analyze it, too
    this._analyze()

    // If the schema was changed by this cleanup, we should run it again to see if other things
    // should be removed...and continue to do so until the schema is stable.
    if (schemaToStart !== JSON.stringify(this.schema)) {
      return this.cleanSchema()
    }
  }

  //******************************************************************
  //
  //
  // PRIVATE
  //
  //

  _validate() {
    if (!this.schema) {
      throw new Error('No schema property detected!')
    }

    if (!this.schema.types) {
      throw new Error('No types detected!')
    }

    // Must have a Query type...but not necessarily a Mutation type
    if (!get(this.schema, `queryType.name`)) {
      throw new Error(`No queryType detected!`)
    }
  }

  _analyze() {
    // Map the kind + name to the index in the types array
    this.typeToIndexMap = {}
    this.fieldsOfTypeMap = {}
    this.inputFieldsOfTypeMap = {}
    // AKA Unions
    this.possibleTypesOfTypeMap = {}
    this.argsOfTypeMap = {}

    // Need to keep track of these so that we never remove them for not being referenced
    this.queryTypeName = get(this.schema, 'queryType.name')
    this.mutationTypeName = get(this.schema, 'mutationType.name')
    this.subscriptionTypeName = get(this.schema, 'subscriptionType.name')

    for (let typesIdx = 0; typesIdx < this.schema.types.length; typesIdx++) {
      const type = this.schema.types[typesIdx]
      if (isUndef(type)) {
        continue
      }

      const {
        kind,
        name,
      } = type
      // These come in as null, not undefined
      const fields = type.fields || []
      const inputFields = type.inputFields || []
      const possibleTypes = type.possibleTypes || []

      const typesKey = buildKey({ kind, name })
      this.typeToIndexMap[typesKey] = typesIdx

      for (let fieldsIdx = 0; fieldsIdx < fields.length; fieldsIdx++) {
        const field = fields[fieldsIdx]
        if (isUndef(field)) {
          continue
        }

        const fieldType = digUnderlyingType(field.type)
        // This should always be arrays...maybe empty, never null
        const args = field.args || []

        const fieldsKey = buildKey(fieldType)
        if (!this.fieldsOfTypeMap[fieldsKey]) {
          this.fieldsOfTypeMap[fieldsKey] = []
        }

        const fieldPath = `types.${typesIdx}.fields.${fieldsIdx}`
        this.fieldsOfTypeMap[fieldsKey].push(fieldPath)

        for (let argsIdx = 0; argsIdx < args.length; argsIdx++) {
          const arg = args[argsIdx]
          if (isUndef(arg)) {
            continue
          }
          const argType = digUnderlyingType(arg.type)

          const argsKey = buildKey(argType)
          if (!this.argsOfTypeMap[argsKey]) {
            this.argsOfTypeMap[argsKey] = []
          }

          const argPath = `${fieldPath}.args.${argsIdx}`
          this.argsOfTypeMap[argsKey].push(argPath)
        }
      }

      for (let inputFieldsIdx = 0; inputFieldsIdx < inputFields.length; inputFieldsIdx++) {
        const inputField = inputFields[inputFieldsIdx]
        if (isUndef(inputField)) {
          continue
        }
        const inputFieldType = digUnderlyingType(inputField.type)
        const inputFieldsKey = buildKey(inputFieldType)
        if (!this.inputFieldsOfTypeMap[inputFieldsKey]) {
          this.inputFieldsOfTypeMap[inputFieldsKey] = []
        }
        const inputFieldPath = `types.${typesIdx}.inputFields.${inputFieldsIdx}`
        this.inputFieldsOfTypeMap[inputFieldsKey].push(inputFieldPath)
      }

      for (let possibleTypesIdx = 0; possibleTypesIdx < possibleTypes.length; possibleTypesIdx++) {
        const possibleType = possibleTypes[possibleTypesIdx]
        if (isUndef(possibleType)) {
          continue
        }

        const possibleTypeType = digUnderlyingType(possibleType)
        const possibleTypeKey = buildKey(possibleTypeType)
        if (!this.possibleTypesOfTypeMap[possibleTypeKey]) {
          this.possibleTypesOfTypeMap[possibleTypeKey] = []
        }
        const possibleTypePath = `types.${typesIdx}.possibleTypes.${possibleTypesIdx}`
        this.possibleTypesOfTypeMap[possibleTypeKey].push(possibleTypePath)
      }
    }
  }

  _fixQueryAndMutationAndSubscriptionTypes(response) {
    for (const [key, defaultTypeName] of [['queryType', 'Query'], ['mutationType', 'Mutation'], ['subscriptionType', 'Subscription']]) {
      const queryOrMutationOrSubscriptionTypeName = get(response, `__schema.${key}.name`)
      if (queryOrMutationOrSubscriptionTypeName && !this.getType({ kind: KINDS.OBJECT, name: queryOrMutationOrSubscriptionTypeName })) {
        this.schema[key] = { name: defaultTypeName }
      }
    }
  }

  _getTypeIndex({ kind, name }) {
    const key = buildKey({ kind, name })
    if (Object.prototype.hasOwnProperty.call(this.typeToIndexMap, key)) {
      return this.typeToIndexMap[key]
    }

    return false
  }

  _removeThingsOfType({ kind, name, map, cleanup = true }) {
    const key = buildKey({ kind, name })
    for (const path of (map[key] || [])) {
      unset(this.schema, path)
    }

    delete map[key]

    if (cleanup) {
      this.cleanSchema()
    }
  }

  _removeFieldsOfType({
    kind,
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    return this._removeThingsOfType({ kind, name, map: this.fieldsOfTypeMap, cleanup })
  }

  _removeInputFieldsOfType({
    kind,
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    return this._removeThingsOfType({ kind, name, map: this.inputFieldsOfTypeMap, cleanup })
  }

  // AKA Unions
  _removePossibleTypesOfType({
    kind,
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    return this._removeThingsOfType({ kind, name, map: this.possibleTypesOfTypeMap, cleanup })
  }

  _removeArgumentsOfType({
    kind,
    name,
    // Clean up the schema afterwards?
    cleanup = true,
  }) {
    return this._removeThingsOfType({ kind, name, map: this.argsOfTypeMap, cleanup })
  }

  _cloneSchema() {
    return JSON.parse(JSON.stringify(this.schema))
  }

  _hasType({ kind, name }) {
    const key = buildKey({ kind, name })
    return Object.prototype.hasOwnProperty.call(this.typeToIndexMap, key)
  }
}

// A function that digs through any Non-Null and List nesting and returns the underlying Type
export function digUnderlyingType(type) {
  while ([KINDS.NON_NULL, KINDS.LIST].includes(type.kind)) {
    type = type.ofType
  }
  return type
}

// A function that returns a Boolean indicating whether a Type is special GraphQL reserved Type.
export function isReservedType(type) {
  return type.name.startsWith('__')
}

function buildKey({ kind, name }) {
  return kind + ':' + name
}

function isUndef(item) {
  return typeof item === 'undefined'
}

function mapProps({ props, map }) {
  return Object.entries(map).reduce(
    (acc, [from, to]) => {
      if (Object.prototype.hasOwnProperty.call(props, from)) {
        acc[to] = props[from]
      }
      return acc
    },
    {},
  )
}
