/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
 */

const parser = require('postcss-selector-parser');

/**
 * @type {import('postcss').PluginCreator}
 * @param {Object} opts
 * @param {string} opts.globalNestedPseudo - the pattern to search for, :global-nested by default
 * @param {string} opts.globalPseudo - the replacement pseudo for the wrapper, :global by default
 */
module.exports = ({ globalNestedPseudo = ':global-nested', globalPseudo = ':global' } = {}) => {
    function isGlobalNestedSelector(selector) {
        return selector.type === 'pseudo' && selector.value === globalNestedPseudo;
    }
    const processed = Symbol('processed');

    return {
        postcssPlugin: 'postcss-global-nested',
        Rule(rule, { result }) {
            if (rule[processed] || !rule.selector.includes(globalNestedPseudo)) {
                return;
            }
            rule[processed] = true;
            //console.log(`IN : ${rule.selector}`);

            function transformSelector(rawSelector) {
                return parser(selectors => {
                    let startIndex = 0;

                    //Find the start of the global nested part.
                    // for example in "p.bar .foo:global-nested(span):hover"
                    // [p, .bar, ' ', .foo, :global-nested, span, :hover]
                    // the start index is 3 (because .foo is part of it)
                    selectors.walk((selector, index) => {
                        if (isGlobalNestedSelector(selector)) {
                            startIndex = index;

                            while (startIndex > 0) {
                                const prevSelector = selector.parent.at(startIndex);
                                if (!prevSelector || prevSelector.type === 'combinator') {
                                    break;
                                }
                                startIndex--;
                            }
                        }
                    });

                    //When :global-nested is the first selector we just replace it by :global
                    if (startIndex === 0) {
                        selectors.walkPseudos(selector => {
                            if (isGlobalNestedSelector(selector)) {
                                selector.value = globalPseudo;
                            }
                        });
                        result.warn(
                            `Using ${globalNestedPseudo} at the beginning of a selector is not yet well supported.`,
                            { node: rule }
                        );
                        return;
                    }

                    //Build the global pseudo AST
                    // for example "p.bar .foo:global-nested(span):hover"
                    // to "p.bar :global(.foospan:hover)

                    let newSelector = parser.selector();
                    function getWalker(start) {
                        return (selector, index) => {
                            if (index > start) {
                                if (isGlobalNestedSelector(selector)) {
                                    selector.nodes.forEach(node => {
                                        if (node.type === 'selector') {
                                            node.walk(getWalker(-1));
                                        }
                                    });
                                } else {
                                    newSelector.append(selector.clone());
                                }
                                selector.parent.removeChild(selector);
                            }
                        };
                    }
                    selectors.walk(getWalker(startIndex));

                    let globalSelector = parser.selector();
                    let pseudo = parser.pseudo({ value: globalPseudo });

                    //fix the class order introduced by postcss-nesting
                    // from "p.bar :global(.foospan:hover)
                    // to "p.bar :global(span.foo:hover)
                    newSelector.each(selector => {
                        const prev = selector.prev();
                        if (prev && prev.type === 'class' && selector.type === 'tag') {
                            selector.parent.insertAfter(selector, prev.clone());
                            prev.parent.removeChild(prev);
                        }
                    });

                    pseudo.append(newSelector);
                    globalSelector.append(pseudo);

                    if (selectors.last) {
                        selectors.last.append(globalSelector);
                    }
                }).processSync(rawSelector);
            }

            const transformed = rule.selector.split(',').map(transformSelector).join(',');

            const clone = rule.clone({ selector: `${transformed}` });

            rule.replaceWith(clone);
        }
    };
};

module.exports.postcss = true;
