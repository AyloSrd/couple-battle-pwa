# How to play

- **The page scrolls.** Four principle cards come before the modes, so no single screen holds everything. The carousel has a height of its own, sized so one mode slide shows whole on a phone, instead of taking "whatever is left".
- **The principles are a domain table** (`domain/principles.ts`), not markup: ids, badges and string keys are data a test can check in all four languages; `Principles` only renders it. The seating diagram is one spoken element (an `img` with the alt text) so a screen reader hears one sentence, not eight fragments.
- **The carousel's keys need focus.** Arrow keys, Home and End are handled by `onKeyDown` on the focusable track. With a page that scrolls, a `window` listener would steal Home / End from the page itself.
- **The transition lives outside this view.** Back passes the `rules-up` type to the router; the keyframes are in `styles/global.css` because the document's view-transition pseudo-elements must exist before this lazy route loads. Home passes `rules-down`.
