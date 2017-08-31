
'use strict';
/* @flow */

var walk = require('./walk');

/**
 * Exclude given access levels from the generated documentation: this allows
 * users to write documentation for non-public members by using the
 * `@private` tag.
 *
 * @param {Array<string>} [levels=['public', 'undefined', 'protected']] included access levels.
 * @param {Array<Object>} comments parsed comments (can be nested)
 * @return {Array<Object>} filtered comments
 */
function filterAccess(levels/*: Array<string>*/, comments/*: Array<Comment>*/) {
  levels = levels || ['public', 'undefined', 'protected'];
  var shouldFilterPrivate = levels.indexOf('private') === -1;

  function filter(comment) {
    return comment.kind === 'note' ||
      (!comment.ignore && levels.indexOf(String(comment.access)) !== -1);
  }

  function recurse(comment) {
    for (var scope in comment.members) {
      comment.members[scope] = comment.members[scope].filter(filter);
    }

    // documentation.js has no common way to filter private properties. It will not attach
    // the `access` attribute to properties. But using the parameter config.inferPrivate,
    // the attribute `access: 'private'` will be attached, if relevant. We therefore
    // remove these properties here if it makes sense. Since it is not standard, there
    // is no need to check for other values of `access`.
    if (shouldFilterPrivate) {
      comment.properties = comment.properties.filter(p => p.access !== 'private');
    }
  }

  return walk(comments.filter(filter), recurse);
}

module.exports = filterAccess;
