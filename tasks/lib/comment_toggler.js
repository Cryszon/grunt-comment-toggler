/*
 * grunt-comment-toggler
 * 
 *
 * Copyright (c) 2014 Kimmo Salmela
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    var exports = {};

    exports.options = {
        removeCommands: false,
        padding: 1
    };

    // Format: <!-- comments:(action) (commentCharacter) -->
    var startRegex = /<!--\s*comments:\s*(\w*)\s*([^\s]+)\s*-->/i;
    var endRegex = /<!--\s*endcomments\s*-->/i;

    var operation = {
        // Possible types: search, comment, uncomment, toggle
        type: "search",
        commentCharacter: "",
        endcommentCharacter: "",
        commentRegex: null
    };

    var validActions = [
        "comment",
        "uncomment",
        "toggle"
    ];
    
    /**
     * Looks for comment build blocks inside content, processes them and returns
     * the processed content.
     * 
     * @param {String} content
     * @returns {String}
     */
    exports.processFile = function(content) {
        // Split content to an array of lines and store the original newline
        var newlineChar = (content.match(/\r\n/g)) ? "\r\n" : "\n";
        var lines = content.split(newlineChar);

        lines.forEach(function(line, i, lines) {

            // If we're currently processing a block and the line matches
            // endRegex, we should return to searching the next build block
            if (operation.type !== "search" && line.match(endRegex)) {
                operation.type = "search";

                if (exports.options.removeCommands) {
                    lines[i] = "";
                }

                return;
            }
            
            var regex = operation.commentRegex;
            var startDelim = operation.commentCharacter;
            var endDelim = operation.endcommentCharacter;

            switch (operation.type) {
                case "search":
                    lines[i] = search(line);
                    break;

                case "comment":
                    lines[i] = comment(line, regex, startDelim, endDelim);
                    break;

                case "uncomment":
                    lines[i] = uncomment(line, regex);
                    break;

                case "toggle":
                    line = comment(line, regex, startDelim, endDelim);
                    lines[i] = (line !== lines[i]) ? line : uncomment(line, regex);
                    break;
            }
        });

        // If we're still running a comment operation after the last line it
        // means that there was a missing "endcomments" tag
        if (operation.type !== "search") {
            grunt.log.warn("Missing 'endcomments' tag.");
        }

        content = lines.join(newlineChar);

        return content;
    };
    
    /**
     * Searches a line for a build block and updates 'operation' accordingly.
     * 
     * @param {String} line
     * @returns {String}
     */
    var search = function(line) {
        var m = line.match(startRegex);
        
        if (m) {
            var type = m[1].toLowerCase();
            var char = m[2];
            var endChar = "";

            if (validActions.indexOf(type) === -1) {
                grunt.fail.warn("Invalid command: '" + type + "'");
            }

            // Handle special comment blocks for HTML and CSS
            if (char.toLowerCase() === "html") {
                char = "<!--";
                endChar = "-->";
            } else if (char.toLowerCase() === "css") {
                char = "/*";
                endChar = "*/";
            }

            operation.type = type;
            operation.commentCharacter = char;
            operation.endcommentCharacter = endChar;

            // Escape comment delimiters for Regex insertion
            char = escapeRegExp(char);
            endChar = (endChar) ? escapeRegExp(endChar) : "";

            // Build comment searching Regex from comment delimiters
            // Capture groups: (whitespace) (commentChar) (content)
            operation.commentRegex = new RegExp("^(\\s*)(" + char + ")(.*)" + endChar);

            // Handle optional removal of build block
            if (exports.options.removeCommands) {
                line = "";
            }
        }

        return line;
    };
    
    /**
     * Returns a commented line
     * 
     * Checks if a line is commented using commentRegex. If not, it is commented
     * using supplied start and end delimiters.
     * 
     * 
     * @param {String} line
     * @param {RegExp} commentRegex
     * @param {String} startDelim Comment start delimiter
     * @param {String} endDelim Comment end delimiter
     * @returns {String}
     */
    var comment = function(line, commentRegex, startDelim, endDelim) {
        // Return already commented line
        if (line.match(commentRegex)) {
            return line;
        }

        // Separate whitespace from content to retain indenting level
        var m = line.match(/^(\s*)(.*)/);
        var whitespace = m[1];
        var content = m[2];

        // Create a padding string with length according to options
        // TODO - ES6 - http://goo.gl/WFr5qY
        var padding = new Array(exports.options.padding + 1).join(" ");

        // Add padding to end delimiter if it's used
        endDelim = (endDelim) ? padding + endDelim : "";

        // Build the commented line
        line = whitespace + startDelim + padding + content.trim() + endDelim;

        return line;
    };
    
    /**
     * Returns an uncommented line
     * 
     * Checks if a line is commented using commentRegex and returns it
     * uncommented.
     * 
     * @param {String} line
     * @param {RegExp} commentRegex
     * @returns {String}
     */
    var uncomment = function(line, commentRegex) {
        // Capture: (whitespace) (commentChar) (content)
        var m = line.match(commentRegex);

        // Return already uncommented line
        if (m === null) {
            return line;
        }

        var whitespace = m[1];
        var content = m[3];

        // Build the uncommented line
        line = whitespace + content.trim();

        return line;
    };
    
    // http://goo.gl/L7cZZN
    var escapeRegExp = function(string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    };

    return exports;

};