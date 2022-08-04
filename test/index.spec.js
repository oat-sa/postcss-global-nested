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

const postcss = require('postcss');

const plugin = require('../index.js');

function run(input) {
    return postcss([
        require('postcss-preset-env')({
            stage: 1,
            features: {
                'nesting-rules': {
                    noIsPseudoSelector: true
                }
            },
            insertAfter: {
                'nesting-rules': plugin
            }
        })
    ]).process(input);
}

test.each([
    ['a{ }', 'a{ }'],
    ['a:foo{ }', 'a:foo{ }'],
    ['p :global(span){ }', 'p :global(span){ }'],
    ['p{&:global(.foo){ } }', 'p:global(.foo){ }'],
    ['p{&:global(.foo){&:hover{}&:disabled{}} }', 'p:global(.foo):hover{}\np:global(.foo):disabled{}'],
    ['p{& :global-nested(.foo){&:hover{}&:disabled{}} }', 'p :global(.foo:hover){}\np :global(.foo:disabled){}'],
    ['.foo {& > .bar:global-nested(span){&:hover{}} }', '.foo > :global(span.bar:hover){}']
])('transforms "%s" to "%s"', (input, output) =>
    run(input).then(result => {
        expect(result.css).toEqual(output);
        expect(result.warnings()).toHaveLength(0);
    })
);

test('transforms a complex stylesheet', () => {
    const stylesheet = `
.root :global-nested([dir='rtl'] .level1) {
    & > .level2 {
        &::after {
            border-left: 0;
        }
        & > :not(.level3) {
            &:last-child {
                padding-left: 1rem;
            }
        }
    }
}

.root {
    & .level1 :global-nested(button),
    & .level2 :global-nested(button) {
        &:hover {
            color: red;
        }
    }
}

.content, .root {
  & > :global-nested(svg){
    &.interactive {
      display: block
    }
    & + .foo,
    &.bar {
      z-index: -3;
    }
  }
}

@media screen and (max-width: 780px) {
  .content {
    & :global-nested(button) {
      &:hover{
        color: purple;
        border: solid 1px red;
      }
      &::after{
        content: 'x';
      }
      & > span.foo {
        font-size: .5em;
      }
    }
  }
}
    `;
    return run(stylesheet).then(result => {
        expect(result.css).toMatchSnapshot();
        expect(result.warnings()).toHaveLength(0);
    });
});

test.each([
    [':global-nested(button){&:focus{}}', ':global(button):focus{}'],
    [':global-nested(button){& > :focus{}}', ':global(button) > :focus{}']
])('warns when the pseudo is used as 1st selector', (input, output) =>
    run(input, output).then(result => {
        expect(result.css).toEqual(output);
        expect(result.warnings()).toHaveLength(1);
    })
);
