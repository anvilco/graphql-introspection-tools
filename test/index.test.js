import isEqual from 'lodash.isequal'
import {
  Microfiber,
  KINDS,
} from '../index'

import {
  introspectionResponseFromSchemaSDL,
} from './test-helpers'


describe('index', function () {
  def('QueryType', () => `type Query {
      myTypes: [MyType!]
    }`
  )

  def('MutationType', () => `type Mutation {
      createYetAnotherType(name: String!): YetAnotherType!
    }`
  )

  def('SubscriptionType', () => `type Subscription {
      subscribeToMyTypeFieldStringChanges(myTypeId: ID): RandomTypeOne!
    }`
  )

  def('schemaSDLBase', () => `

    # From the GraphQL docs:
    #
    # https://graphql.org/graphql-js/mutations-and-input-types/
    # Input types can't have fields that are other objects, only basic scalar types, list types,
    # and other input types.

    scalar SecretScalar

    enum SecretEnum {
      ENUM1
      ENUM2
      ENUM3
    }

    input InputWithSecretScalar {
      string: String
      secretScalar: [SecretScalar]
    }

    input InputWithSecretEnum {
      string: String
      otherString: String
      secretEnum: [SecretEnum]
    }

    union SecretUnion =
      MyType
      | MyOtherType

    ${$.QueryType}

    ${$.MutationType}

    ${$.SubscriptionType}

    interface MyInterface {
      id: String!
    }

    type MyType implements MyInterface {
      # required due to Interface
      id: String!

      # The control
      fieldString(argString: String): String

      # SecretScalar stuff

      # Fields returning SecretScalar
      fieldSecretScalar: SecretScalar
      fieldSecretScalarArray: [SecretScalar]
      fieldSecretScalarNonNullArray: [SecretScalar]!
      fieldSecretScalarNonNullArrayOfNonNulls: [SecretScalar!]!

      # Fields with args containing SecretScalars
      fieldStringWithSecretScalarArg(
        argString: String,
        argSecretScalar: SecretScalar
      ): String

      fieldStringWithSecretScalarArrayArg(
        argString: String,
        argSecretScalar: [SecretScalar]
      ): String

      fieldStringWithSecretScalarNonNullArrayArg(
        argString: String,
        argSecretScalar: [SecretScalar]!
      ): String

      fieldStringWithSecretScalarNonNullArrayOfNonNullsArg(
        argString: String,
        argSecretScalar: [SecretScalar!]!
      ): String

      # Fields with Inputs that contain SecretScalar
      fieldWithSecretScalarInputArg(input: InputWithSecretScalar): String

      # Fields with Inputs that contain SecretEnum
      fieldWithSecretEnumInputArg(input: InputWithSecretEnum): String


      # SecretEnum stuff

      # Fields returning SecretEnum
      fieldSecretEnum: SecretEnum
      fieldSecretEnumArray: [SecretEnum]
      fieldSecretEnumNonNullArray: [SecretEnum]!
      fieldSecretEnumNonNullArrayOfNonNulls: [SecretEnum!]!

      # Fields with args containing SecretEnum
      fieldStringWithSecretEnumArg(
        argString: String,
        argSecretEnum: SecretEnum
      ): String

      fieldStringWithSecretEnumArrayArg(
        argString: String,
        argSecretEnum: [SecretEnum]
      ): String

      fieldStringWithSecretEnumNonNullArrayArg(
        argString: String,
        argSecretEnum: [SecretEnum]!
      ): String

      fieldStringWithSecretEnumNonNullArrayOfNonNullsArg(
        argString: String,
        argSecretEnum: [SecretEnum!]!
      ): String


      # SecretUnion stuff

      # Fields returning SecretUnion
      fieldSecretUnion: SecretUnion
      fieldSecretUnionArray: [SecretUnion]
      fieldSecretUnionNonNullArray: [SecretUnion]!
      fieldSecretUnionNonNullArrayOfNonNulls: [SecretUnion!]!
    }

    type MyOtherType {
      fieldString(argString: String): String
    }

    type YetAnotherType {
      fieldString: String
    }

    type RandomTypeOne {
      fieldString: String
    }

    "Should not show up because it was not used anywhere"
    type NotUsed {
      referencedButNotUsed: ReferencedButNotUsed
    }

    "Should not show up because the only thing that references it was not used"
    type ReferencedButNotUsed {
      name: String
    }

    "I am definitely not used at all"
    type TotallyNotUsed {
      name: String
    }
  `
  )
  def('schemaSDL', () => $.schemaSDLBase)

  def('metadataBase', () => ({
    'OBJECT': {
      MyType: {

      },
      OtherType: {

      },
      Query: {

      },
      Mutation: {

      }
    },
    'INPUT_OBJECT': {
      MyInput: {

      },
    }
  }))

  def('metadata', () => $.metadataBase)

  def('rawResponse', () => introspectionResponseFromSchemaSDL({
    schemaSDL: $.schemaSDL
  }))

  def('response', () => $.rawResponse)

  def('schema', () => $.response.__schema)

  it('works', function () {
    let microfiber = new Microfiber($.response, { cleanupSchemaImmediately: false })
    let response = microfiber.getResponse()

    //************************
    //
    // Sanity checks
    expect(isEqual($.response, response)).to.be.true

    microfiber = new Microfiber($.response)
    response = microfiber.getResponse()
    // Some cleanup occurred right away
    expect(isEqual($.response, response)).to.not.be.true

    let queryType = microfiber.getQueryType()
    expect(queryType).to.be.ok
    expect(queryType).to.eql(findType({ kind: KINDS.OBJECT, name: 'Query', response }))
    expect(microfiber.getQuery({ name: 'myTypes' })).be.ok

    let mutationType = microfiber.getMutationType()
    expect(mutationType).to.be.ok
    expect(mutationType).to.eql(findType({ kind: KINDS.OBJECT, name: 'Mutation', response }))
    expect(microfiber.getMutation({ name: 'createYetAnotherType' })).be.ok

    let subscriptionType = microfiber.getSubscriptionType()
    expect(subscriptionType).to.be.ok
    expect(subscriptionType).to.eql(findType({ kind: KINDS.OBJECT, name: 'Subscription', response }))
    expect(microfiber.getSubscription({ name: 'subscribeToMyTypeFieldStringChanges' })).be.ok

    expect(microfiber.getType({ kind: KINDS.INTERFACE, name: 'MyInterface' })).to.be.ok

    expect(microfiber.getType({ name: 'NotUsed' })).to.not.be.ok
    expect(microfiber.getType({ name: 'ReferencedButNotUsed' })).to.not.be.ok
    expect(microfiber.getType({ name: 'TotallyNotUsed' })).to.not.be.ok

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', response })).to.be.ok
    expect(findType({ kind: KINDS.SCALAR, name: 'SecretScalar', response })).to.be.ok

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalar', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalarArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalarNonNullArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalarNonNullArrayOfNonNulls', response })).to.be.ok

    let arg = microfiber.getArg({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarArg', argName: 'argSecretScalar', response })
    expect(arg).to.be.ok
    expect(arg).to.eql(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarArg', argName: 'argSecretScalar', response }))
    arg = microfiber.getArg({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarArg', argName: 'argSecretScalar', response })
    expect(arg).to.be.ok
    arg = microfiber.getArg({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarArrayArg', argName: 'argSecretScalar', response })
    expect(arg).to.be.ok
    arg = microfiber.getArg({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarNonNullArrayArg', argName: 'argSecretScalar', response })
    expect(arg).to.be.ok
    arg = microfiber.getArg({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarNonNullArrayOfNonNullsArg', argName: 'argSecretScalar', response })
    expect(arg).to.be.ok

    // Won't work because typeKind defaults to OBJECT
    expect(microfiber.getField({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.not.be.ok
    // This works, though
    expect(microfiber.getField({ typeKind: KINDS.INPUT_OBJECT, typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.eql(
      microfiber.getField({ typeKind: KINDS.INPUT_OBJECT, typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })
    )
    expect(microfiber.getInputField({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.eql(
      findInputFieldOnInputType({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar', response })
    )
    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretScalarInputArg' })).to.be.ok
    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretScalarInputArg' })).to.eql(
      findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretScalarInputArg', response })
    )

    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum' })).to.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum' })).to.eql(
      findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum', response })
    )
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg', response })).to.be.ok

    //
    //
    //************************

    let secretEnum = findType({ kind: KINDS.ENUM, name: 'SecretEnum', response })
    expect(secretEnum).to.be.ok
    expect(secretEnum.enumValues).to.be.an('array').of.length(3)

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnum', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumNonNullArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumNonNullArrayOfNonNulls', response })).to.be.ok

    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumArg', argName: 'argSecretEnum', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumArrayArg', argName: 'argSecretEnum', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumNonNullArrayArg', argName: 'argSecretEnum', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumNonNullArrayOfNonNullsArg', argName: 'argSecretEnum', response })).to.be.ok


    expect(findType({ kind: KINDS.UNION, name: 'SecretUnion', response})).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnion', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArrayOfNonNulls', response })).to.be.ok

    // OK, let's do some things

    // Remove SecretScalar
    microfiber.removeType({ kind: KINDS.SCALAR, name: 'SecretScalar' })
    response = microfiber.getResponse()
    expect(isEqual($.response, response)).to.be.false
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Subscription', response })).to.be.ok

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', response })).to.be.ok
    expect(findType({ kind: KINDS.SCALAR, name: 'SecretScalar', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalar', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalarArray', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalarNonNullArray', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretScalarNonNullArrayOfNonNulls', response })).to.not.be.ok

    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarArg', argName: 'argSecretScalar', response })).to.not.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarArrayArg', argName: 'argSecretScalar', response })).to.not.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarNonNullArrayArg', argName: 'argSecretScalar', response })).to.not.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretScalarNonNullArrayOfNonNullsArg', argName: 'argSecretScalar', response })).to.not.be.ok

    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar', response })).to.not.be.ok
    expect(microfiber.getField({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.not.be.ok
    expect(microfiber.getField({ typeKind: KINDS.INPUT_OBJECT, typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.not.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretScalar', fieldName: 'secretScalar' })).to.not.be.ok
    // these should still be ok
    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretScalarInputArg' })).to.be.ok
    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretScalarInputArg' })).to.eql(
      findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretScalarInputArg', response })
    )
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg', response })).to.be.ok

    // Remove a specific SecretEnum value

    secretEnum = findType({ kind: KINDS.ENUM, name: 'SecretEnum', response })
    expect(secretEnum).to.be.ok
    expect(secretEnum.enumValues).to.be.an('array').of.length(3)

    microfiber.removeEnumValue({ name: 'SecretEnum', value: 'ENUM2' })
    response = microfiber.getResponse()
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Subscription', response })).to.be.ok

    // Removed that value so only 2 left
    secretEnum = findType({ kind: KINDS.ENUM, name: 'SecretEnum', response })
    expect(secretEnum).to.be.ok
    expect(secretEnum.enumValues).to.be.an('array').of.length(2)

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnum', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumNonNullArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumNonNullArrayOfNonNulls', response })).to.be.ok

    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumArg', argName: 'argSecretEnum', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumArrayArg', argName: 'argSecretEnum', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumNonNullArrayArg', argName: 'argSecretEnum', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumNonNullArrayOfNonNullsArg', argName: 'argSecretEnum', response })).to.be.ok


    // Remove SecretEnum completely

    microfiber.removeType({ kind: KINDS.ENUM, name: 'SecretEnum' })
    response = microfiber.getResponse()
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Subscription', response })).to.be.ok

    expect(findType({ kind: KINDS.ENUM, name: 'SecretEnum', response })).to.not.be.ok

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnum', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumArray', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumNonNullArray', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretEnumNonNullArrayOfNonNulls', response })).to.not.be.ok

    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumArg', argName: 'argSecretEnum', response })).to.not.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumArrayArg', argName: 'argSecretEnum', response })).to.not.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumNonNullArrayArg', argName: 'argSecretEnum', response })).to.not.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldStringWithSecretEnumNonNullArrayOfNonNullsArg', argName: 'argSecretEnum', response })).to.not.be.ok

    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg' })).to.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg', response })).to.be.ok

    // Remove an Arg from a Field

    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', argName: 'argString', response })).to.be.ok
    microfiber.removeArg({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', argName: 'argString' })
    response = microfiber.getResponse()
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Subscription', response })).to.be.ok
    expect(findArgOnFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', argName: 'argString', response })).to.not.be.ok

    // Remove a Field from a Type

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', response })).to.be.ok
    microfiber.removeField({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString' })
    response = microfiber.getResponse()
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Subscription', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldString', response })).to.not.be.ok

    // Remove an Input Field from an Input Object

    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg' })).to.be.ok
    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg' })).to.eql(
      findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg', response })
    )
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum' })).to.not.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'secretEnum', response })).to.not.be.ok

    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'string' })).to.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'string', response })).to.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'otherString' })).to.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'otherString', response })).to.be.ok

    // This won't work due to typeKind defaulting to OBJECT
    microfiber.removeField({ typeName: 'InputWithSecretEnum', fieldName: 'string' })
    response = microfiber.getResponse()
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'string' })).to.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'string', response })).to.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'otherString' })).to.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'otherString', response })).to.be.ok

    // But this will work...
    microfiber.removeField({ typeKind: KINDS.INPUT_OBJECT, typeName: 'InputWithSecretEnum', fieldName: 'string' })
    response = microfiber.getResponse()
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'string' })).to.not.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'string', response })).to.not.be.ok
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'otherString' })).to.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'otherString', response })).to.be.ok

    microfiber.removeInputField({ typeName: 'InputWithSecretEnum', fieldName: 'otherString' })
    response = microfiber.getResponse()
    expect(microfiber.getInputField({ typeName: 'InputWithSecretEnum', fieldName: 'otherString' })).to.not.be.ok
    expect(findInputFieldOnInputType({ typeName: 'InputWithSecretEnum', fieldName: 'otherString', response })).to.not.be.ok
    // That's the last of the inputFields...so it should be empty and not null
    expect(microfiber.getType({ kind: KINDS.INPUT_OBJECT, name: 'InputWithSecretEnum' })).to.be.ok
    expect(microfiber.getType({ kind: KINDS.INPUT_OBJECT, name: 'InputWithSecretEnum' }).inputFields).to.eql([])


    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg' })).to.be.ok
    expect(microfiber.getField({ typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg' })).to.eql(
      findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldWithSecretEnumInputArg', response })
    )

    // Remove in Input Type completely

    // Remove possible type from a Union Type

    let unionType = findType({ kind: KINDS.UNION, name: 'SecretUnion', response })
    expect(unionType).to.be.ok
    expect(unionType.possibleTypes).to.be.an('array').of.length(2)

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnion', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArrayOfNonNulls', response })).to.be.ok

    microfiber.removePossibleType({ typeName: 'SecretUnion', possibleTypeKind: KINDS.OBJECT, possibleTypeName: 'MyType' })
    response = microfiber.getResponse()
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok

    unionType = microfiber.getType({ kind: KINDS.UNION, name: 'SecretUnion' })
    expect(unionType).to.be.ok
    expect(unionType).to.eql(
      findType({ kind: KINDS.UNION, name: 'SecretUnion', response })
    )
    expect(unionType.possibleTypes).to.be.an('array').of.length(1)
    // Only MyOtherType is left
    expect(unionType.possibleTypes.map((possibleType) => possibleType.name)).to.eql(['MyOtherType'])

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnion', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArray', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArrayOfNonNulls', response })).to.be.ok

    // Remove a Union Type completely

    microfiber.removeType({ kind: KINDS.UNION, name: 'SecretUnion' })
    response = microfiber.getResponse()
    expect(findType({ kind: KINDS.OBJECT, name: 'Query', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'Mutation', response })).to.be.ok

    expect(findType({ kind: KINDS.UNION, name: 'SecretUnion', response})).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnion', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionArray', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArray', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'MyType', fieldName: 'fieldSecretUnionNonNullArrayOfNonNulls', response })).to.not.be.ok

    // Remove the myTypes Query...which should remove MyType as well now that there are no references to it

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'Query', fieldName: 'myTypes', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'MyType', response })).to.be.ok

    expect(microfiber.getType({ kind: KINDS.INTERFACE, name: 'MyInterface' })).to.be.ok

    microfiber.removeQuery({ name: 'myTypes' })
    response = microfiber.getResponse()

    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'Query', fieldName: 'myTypes', response })).to.not.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'MyType', response })).to.not.be.ok
    expect(microfiber.getType({ kind: KINDS.INTERFACE, name: 'MyInterface' })).to.not.be.ok

    // Remove YetAnotherType...which should remove the createYetAnotherType Mutation as well now that there are no
    // references to it

    expect(findType({ kind: KINDS.OBJECT, name: 'YetAnotherType', response })).to.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'Mutation', fieldName: 'createYetAnotherType', response })).to.be.ok

    microfiber.removeType({ kind: KINDS.OBJECT, name: 'YetAnotherType' })
    response = microfiber.getResponse()

    expect(findType({ kind: KINDS.OBJECT, name: 'YetAnotherType', response })).to.not.be.ok
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'Mutation', fieldName: 'createYetAnotherType', response })).to.not.be.ok

    //********************************
    // Remove the "subscribeToMyTypeFieldStringChanges" Subscription, which should remove the "RandomTypeOne" now that nothing
    // references it

    // Make sure they're there to start with
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'Subscription', fieldName: 'subscribeToMyTypeFieldStringChanges', response })).to.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'RandomTypeOne', response })).to.be.ok

    // Remove them, and make sure they're not there
    microfiber.removeSubscription({ name: 'subscribeToMyTypeFieldStringChanges' })
    response = microfiber.getResponse()
    expect(findFieldOnType({ typeKind: KINDS.OBJECT, typeName: 'Subscription', fieldName: 'subscribeToMyTypeFieldStringChanges', response })).to.not.be.ok
    expect(findType({ kind: KINDS.OBJECT, name: 'RandomTypeOne', response })).to.not.be.ok

    //
    //
    //********************************


    // Make sure that removing the Mutation type does some things
    expect(findType({ kind: mutationType.kind, name: mutationType.name, response })).to.be.ok
    expect(response.__schema.mutationType).to.be.ok
    microfiber.removeType({ kind: mutationType.kind, name: mutationType.name })
    response = microfiber.getResponse()
    expect(findType({ kind: mutationType.kind, name: mutationType.name, response })).to.not.be.ok
    expect(response.__schema.mutationType).to.not.be.ok
  })
})


function findType({ kind, name, response }) {
  return (response.__schema.types || []).find((type) => type.kind === kind && type.name === name)
}

function findFieldOnType({ typeKind, typeName, fieldName, response }) {
  const type = findType({ kind: typeKind, name: typeName, response })
  if (!type) {
    return false
  }
  return (type.fields || []).find((field) => field.name === fieldName)
}

function findArgOnFieldOnType({ typeKind, typeName, fieldName, argName, response }) {
  const field = findFieldOnType({ typeKind, typeName, fieldName, response })
  if (!field) {
    return false
  }
  return (field.args || []).find((arg) => arg.name === argName)
}

function findInputFieldOnInputType({ typeName, fieldName, response }) {
  const type = findType({ kind: KINDS.INPUT_OBJECT, name: typeName, response })
  if (!type) {
    return false
  }

  return (type.inputFields || []).find((inputField => inputField.name === fieldName ))
}
