import assert from "node:assert";
import { describe, it } from "node:test";
import { CURSOR_MARKER, REVERSE_VIDEO_OFF, REVERSE_VIDEO_ON, stripCursorMarker } from "../src/tui.ts";
import { visibleWidth } from "../src/utils.ts";

const cursorCell = (grapheme: string): string => `${REVERSE_VIDEO_ON}${grapheme}${REVERSE_VIDEO_OFF}`;

describe("stripCursorMarker", () => {
	it("returns null when no marker is present", () => {
		assert.equal(stripCursorMarker("plain text", true), null);
		assert.equal(stripCursorMarker("plain text", false), null);
	});

	it("strips only the marker, keeping the reverse-video cell, when not unwrapping", () => {
		const line = `ab${CURSOR_MARKER}${cursorCell("c")}de`;
		const result = stripCursorMarker(line, false);
		assert.equal(result?.line, `ab${cursorCell("c")}de`);
		assert.equal(visibleWidth(result!.line), 5);
	});

	it("strips the marker and de-reverses a mid-line cursor cell when unwrapping", () => {
		const line = `ab${CURSOR_MARKER}${cursorCell("c")}de`;
		const result = stripCursorMarker(line, true);
		assert.equal(result?.line, "abcde");
		assert.equal(visibleWidth(result!.line), 5);
	});

	it("strips the marker and de-reverses an end-of-line space cursor when unwrapping", () => {
		const line = `hello${CURSOR_MARKER}${cursorCell(" ")}`;
		const result = stripCursorMarker(line, true);
		assert.equal(result?.line, "hello ");
		assert.equal(visibleWidth(result!.line), 6);
	});

	it("strips only the marker when unwrapping but no reverse-video cell follows", () => {
		const line = `abc${CURSOR_MARKER}def`;
		const result = stripCursorMarker(line, true);
		assert.equal(result?.line, "abcdef");
	});

	it("preserves styled spans before the marker when unwrapping", () => {
		// A colored span ahead of the cursor must survive untouched: only the
		// marker-adjacent reverse-video wrapper is removed.
		const red = "\x1b[31m";
		const reset = "\x1b[39m";
		const line = `${red}a${reset}${CURSOR_MARKER}${cursorCell("b")}c`;
		const result = stripCursorMarker(line, true);
		assert.equal(result?.line, `${red}a${reset}bc`);
		assert.equal(visibleWidth(result!.line), 3);
	});

	it("consumes only the marker-adjacent reverse-video span, leaving later spans intact", () => {
		// A second, unrelated reverse-video span after the cursor cell must remain
		// reversed; stripCursorMarker must stop at the first REVERSE_VIDEO_OFF.
		const line = `a${CURSOR_MARKER}${cursorCell("b")}c${cursorCell("d")}`;
		const result = stripCursorMarker(line, true);
		assert.equal(result?.line, `abc${cursorCell("d")}`);
		assert.equal(visibleWidth(result!.line), 4);
	});

	it("reports the marker index so callers can measure the column without rescanning", () => {
		// The index refers to the original line, and styled spans ahead of the marker
		// mean it is a raw offset, not a visible column.
		const red = "\x1b[31m";
		const prefix = `${red}ab`;
		const line = `${prefix}${CURSOR_MARKER}${cursorCell("c")}`;
		const result = stripCursorMarker(line, true);
		assert.equal(result?.markerIndex, prefix.length);
		assert.equal(visibleWidth(line.slice(0, result!.markerIndex)), 2);
	});
});
