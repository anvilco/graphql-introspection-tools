import {
  buildSchema,
  getIntrospectionQuery,
  graphqlSync,
} from 'graphql'


export const introspectionResponseFromSchemaSDL = ({ schemaSDL }) => {
  return introspectionResponseFromSchema({
    schema: buildSchema(schemaSDL),
  })
}

function introspectionResponseFromSchema ({ schema }) {
  return standardizeIntrospectionQueryResult(
    graphqlSync({ schema, source: getIntrospectionQuery() })
  )
}

// Get rid of the `data` envelope
function standardizeIntrospectionQueryResult (result) {
  return result.data ? result.data : result
}
