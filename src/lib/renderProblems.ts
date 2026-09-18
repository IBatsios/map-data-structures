/**
 * A `LoadErrorReport`, as the elements the panel shows.
 *
 * Like `renderDrawing`, this is a DOM module that takes the `Document` as an
 * argument rather than reaching for the global one: it keeps the impurity in
 * one visible place, keeps it out of the page's `<script>`, and lets
 * `astro check` type-check it like any other file. It decides nothing — every
 * sentence here was written and tested in `describeLoadError` — so what is left
 * is which element each one goes in.
 *
 * **Every string goes in through `textContent`, never `innerHTML`.** These
 * messages quote a file the app has just refused to trust; a panel that set
 * them as markup would be running that file instead of describing it.
 *
 * Styling reaches these elements through `data-part`, following D23 and D27:
 * `src/styles/upload.module.css` owns the hashed class name on the container,
 * and this module owns nothing but the parts.
 */

import type { LoadErrorReport } from './describeLoadError';
import { describeHiddenProblems } from './describeLoadError';

/**
 * Builds the contents of the validation panel.
 *
 * @param report - what `describeLoadError` said about the file
 * @param doc - the document to build the elements in
 * @returns the elements to put inside the panel; the caller owns the container
 *
 * @example
 * ```typescript
 * panel.replaceChildren(...renderProblems(report, document));
 * ```
 */
export function renderProblems(
  report: LoadErrorReport,
  doc: Document,
): readonly HTMLElement[] {
  const summary = textElement(doc, 'p', report.summary, 'summary');
  const list = doc.createElement('ul');

  list.append(
    ...report.problems.map((problem) => textElement(doc, 'li', problem, 'problem')),
  );

  const note = describeHiddenProblems(report.hiddenProblemCount);

  return note === ''
    ? [summary, list]
    : [summary, list, textElement(doc, 'p', note, 'more')];
}

/** One element holding one sentence, set as text and named for the stylesheet. */
function textElement(
  doc: Document,
  tagName: 'p' | 'li',
  text: string,
  part: string,
): HTMLElement {
  const element = doc.createElement(tagName);

  element.dataset.part = part;
  element.textContent = text;

  return element;
}
