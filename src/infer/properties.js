/* @flow */

const _ = require('lodash');

const flowDoctrine = require('../flow_doctrine');
const findTarget = require('./finders').findTarget;

function prefixedName(name, prefix) {
  if (prefix.length) {
    return prefix.join('.') + '.' + name;
  }
  return name;
}

function propertyToDoc(property, prefix): CommentTag {
  let type = flowDoctrine(property.value);
  const name = property.key.name || property.key.value;
  if (property.optional) {
    type = {
      type: 'OptionalType',
      expression: type
    };
  }
  return {
    title: 'property',
    name: prefixedName(name, prefix),
    lineNumber: property.loc.start.line,
    type
  };
}

/**
 * Infers properties of TypeAlias objects (Flow or TypeScript type definitions)
 *
 * @param {Object} comment parsed comment
 * @returns {Object} comment with inferred properties
 */
function inferProperties(comment: Comment): Comment {
  const explicitProperties = new Set();
  // Ensure that explicitly specified properties are not overridden
  // by inferred properties
  comment.properties.forEach(prop => explicitProperties.add(prop.name));

  function inferProperties(value, prefix) {
    if (value.type === 'ObjectTypeAnnotation') {
      value.properties.forEach(function(property) {
        const inferedPropertyDoc = propertyToDoc(property, prefix);
        // Nested type parameters
        if (property.value.type === 'ObjectTypeAnnotation') {
          inferProperties(property.value, prefix.concat(property.key.name));
        }
        const propertyName = prefixedName(property.key.name, prefix);
        comment.properties = explicitProperties.has(propertyName)
          // If the property has already been explicitly declared in the JSDoc,
          // merge the JSDoc information on top of the inferred one.
          ? comment.properties.map(explicitProperty => (
            explicitProperty.name === propertyName ? _.merge(inferedPropertyDoc, explicitProperty) : explicitProperty
          ))
          // Otherwise, just add the inferred property to the list.
          : comment.properties.concat(inferedPropertyDoc);
      });
    }
  }

  const path = findTarget(comment.context.ast);

  if (path) {
    if (path.isTypeAlias()) {
      inferProperties(path.node.right, []);
    } else if (path.isInterfaceDeclaration()) {
      inferProperties(path.node.body, []);
    }
  }

  return comment;
}

module.exports = inferProperties;
