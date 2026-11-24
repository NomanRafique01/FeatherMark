# Heading Level 1
## Heading Level 2
### Heading Level 3
#### Heading Level 4
##### Heading Level 5
###### Heading Level 6

Paragraph with **bold text**, *italic text*, and ***bold italic text***.
Testing emphasis edge cases: **a_b_c** and _x*y*z_ and *nested `inline code` inside*.

Here is a link to [FeatherMark Documentation](https://feathermark.app) and another [reference link][ref-1].

[ref-1]: https://feathermark.app/guide "Guide"

### Inline Code & Fenced Code Blocks

Here is an `inline_code_snippet(arg1, arg2)` inside normal prose.

```javascript
// Fenced code block
function calculateMeasure(ch = 80) {
  return `${ch}ch`;
}
console.log(calculateMeasure());
```

### Blockquotes

> A quiet, distraction-free writing environment.
> Warm paper, deep ink, muted forest-green accent — not another developer IDE.
>
> > Nested blockquote level 2.

### Lists & Nested Lists

1. First ordered item
2. Second ordered item
   - Nested unordered bullet A
   - Nested unordered bullet B
     1. Deeply nested item 1
     2. Deeply nested item 2
3. Third ordered item

### Task Lists

- [x] Completed task item
- [ ] Incomplete task item
- [ ] Another pending task with `code`

### Tables

| Feature | Design Rule | Token Value |
| :--- | :--- | :--- |
| Accent | Forest Green | `#587858` / `#A0BC98` |
| Background | Warm Paper | `#F5F3ED` / `#20231F` |
| Measure | Centered Bound | ~80ch |

---

Horizontal rule above and concluding note here.
