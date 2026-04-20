"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

const FONT_SIZE = 16;
const LINE_HEIGHT = 24;
const FONT_FAMILY = "Arial";
const FONT = `${FONT_SIZE}px ${FONT_FAMILY}`;

const DEFAULT_TEXT =
  "The quick brown fox jumps over the lazy dog. " +
  "Pretext measures text height and line count without touching the DOM, " +
  "which means zero layout reflow. " +
  "This is especially useful for virtualized lists, masonry layouts, " +
  "and any UI that needs to know text height before paint. " +
  "Try changing the width or editing this text!";

type PretextLine = { text: string; width: number };

type PretextResult = {
  height: number;
  lineCount: number;
  lines: PretextLine[];
};

export default function PretextDemoPage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [containerWidth, setContainerWidth] = useState(320);
  const [pretextResult, setPretextResult] = useState<PretextResult | null>(
    null,
  );
  const [actualHeight, setActualHeight] = useState<number | null>(null);

  const cssRef = useRef<HTMLDivElement>(null);
  // Compute Pretext layout whenever text or width changes — no DOM access
  useEffect(() => {
    const prepared = prepareWithSegments(text || " ", FONT, {
      whiteSpace: "pre-wrap",
    });
    console.log('Prepared: ',prepared)
    const result = layoutWithLines(prepared, containerWidth, LINE_HEIGHT);
    setPretextResult({
      height: result.height,
      lineCount: result.lineCount,
      lines: result.lines.map((l) => ({ text: l.text, width: l.width })),
    });
    console.log('Result: ', result);
  }, [text, containerWidth]);

  // Read the actual DOM height after every paint for comparison
  useLayoutEffect(() => {
    if (cssRef.current) {
      setActualHeight(cssRef.current.offsetHeight);
    }
  });

  const heightDiff =
    pretextResult && actualHeight !== null
      ? Math.abs(pretextResult.height - actualHeight)
      : null;

  return (
    <Container maxWidth='lg'>
      <Typography variant='h4' gutterBottom>
        @chenglou/pretext Demo
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
        <strong>Regular CSS</strong> requires the browser to render the text
        before you can read its height via <code>offsetHeight</code> (triggers
        layout reflow). <strong>Pretext</strong> computes the exact same height
        and line layout in pure JavaScript using canvas font metrics — no DOM,
        no reflow. The two panels below should always match.
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
          Controls
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label='Text'
          value={text}
          onChange={(e) => setText(e.target.value)}
          slotProps={{ input: { style: { fontFamily: FONT_FAMILY } } }}
          sx={{ mb: 2 }}
        />
        <Box sx={{ px: 1 }}>
          <Typography variant='body2' gutterBottom>
            Container width: <strong>{containerWidth}px</strong>
          </Typography>
          <Slider
            min={100}
            max={700}
            value={containerWidth}
            onChange={(_, v) => setContainerWidth(v as number)}
          />
        </Box>
        <Typography variant='caption' color='text.secondary'>
          Font: <code>{FONT}</code> · Line height: <code>{LINE_HEIGHT}px</code>
        </Typography>
      </Paper>

      {/* Side-by-side comparison */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── CSS Column ── */}
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <Typography variant='h6' gutterBottom>
            Regular CSS text
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            display='block'
            sx={{ mb: 1 }}
          >
            Height read from <code>offsetHeight</code> <em>after</em> DOM render
          </Typography>

          <Box
            sx={{
              border: "2px solid",
              borderColor: "divider",
              display: "inline-block",
            }}
          >
            <div
              ref={cssRef}
              style={{
                width: containerWidth,
                fontFamily: FONT_FAMILY,
                fontSize: FONT_SIZE,
                lineHeight: `${LINE_HEIGHT}px`,
                wordBreak: "normal",
                overflowWrap: "break-word",
                whiteSpace: "normal",
                margin: 0,
                padding: 0,
                boxSizing: "border-box",
              }}
            >
              {text || " "}
            </div>
          </Box>

          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`DOM height: ${actualHeight ?? "…"}px`}
              color='default'
              variant='outlined'
              size='small'
            />
          </Box>
        </Box>

        <Divider
          orientation='vertical'
          flexItem
          sx={{ display: { xs: "none", md: "block" } }}
        />

        {/* ── Pretext Column ── */}
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <Typography variant='h6' gutterBottom>
            Pretext layout
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            display='block'
            sx={{ mb: 1 }}
          >
            Height + lines computed <em>before</em> DOM render — no reflow
          </Typography>

          <Box
            sx={{
              border: "2px solid",
              borderColor: "primary.main",
              display: "inline-block",
            }}
          >
            {pretextResult ? (
              <Box
                sx={{
                  width: containerWidth,
                  height: pretextResult.height,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {pretextResult.lines.map((line, i) => (
                  <Tooltip
                    key={i}
                    title={`line width: ${line.width.toFixed(1)}px`}
                    placement='right'
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: i * LINE_HEIGHT,
                        left: 0,
                        height: LINE_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        cursor: "default",
                        "&:hover .line-bar": { opacity: 0.6 },
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT_FAMILY,
                          fontSize: FONT_SIZE,
                          lineHeight: `${LINE_HEIGHT}px`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line.text}
                      </span>
                      {/* thin bar showing Pretext's computed line width */}
                      <Box
                        className='line-bar'
                        sx={{
                          position: "absolute",
                          bottom: 1,
                          left: 0,
                          height: 2,
                          width: line.width,
                          bgcolor: "primary.main",
                          opacity: 0.25,
                          transition: "opacity 0.15s",
                        }}
                      />
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            ) : null}
          </Box>

          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`Pretext height: ${pretextResult?.height ?? "…"}px`}
              color='primary'
              variant='outlined'
              size='small'
            />
            <Chip
              label={`Lines: ${pretextResult?.lineCount ?? "…"}`}
              color='primary'
              size='small'
            />
          </Box>
        </Box>
      </Box>

      {/* Match result */}
      {pretextResult && actualHeight !== null && (
        <Alert
          severity={heightDiff === 0 ? "success" : "warning"}
          sx={{ mt: 3 }}
        >
          {heightDiff === 0
            ? `Perfect match — Pretext predicted ${pretextResult.height}px, DOM reports ${actualHeight}px.`
            : `Height differs by ${heightDiff}px — Pretext: ${pretextResult.height}px, DOM: ${actualHeight}px. ` +
              `This can happen if the system font metrics differ slightly from the canvas measurement.`}
        </Alert>
      )}

      {/* Key differences table */}
      <Paper sx={{ p: 2, mt: 4 }}>
        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
          Why it matters
        </Typography>
        <Box
          component='table'
          sx={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
        >
          <Box component='thead'>
            <Box component='tr'>
              {["", "Regular CSS", "Pretext"].map((h) => (
                <Box
                  key={h}
                  component='th'
                  sx={{
                    textAlign: "left",
                    p: 1,
                    borderBottom: "2px solid",
                    borderColor: "divider",
                    fontWeight: "bold",
                  }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component='tbody'>
            {[
              [
                "Know height before render",
                "✗ No — must wait for paint",
                "✓ Yes — immediate",
              ],
              [
                "Triggers layout reflow",
                "✓ Yes (offsetHeight)",
                "✗ No DOM access",
              ],
              [
                "Virtualization friendly",
                "✗ Hard without guesses",
                "✓ Built-in row heights",
              ],
              ["Works server-side", "✗ No DOM", "✓ Pure JS (canvas polyfill)"],
              [
                "Multilingual / bidi text",
                "✓ Via browser",
                "✓ Unicode + bidi aware",
              ],
            ].map(([label, css, pretext]) => (
              <Box
                key={label}
                component='tr'
                sx={{ "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box
                  component='td'
                  sx={{
                    p: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    fontWeight: "medium",
                  }}
                >
                  {label}
                </Box>
                <Box
                  component='td'
                  sx={{
                    p: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                  }}
                >
                  {css}
                </Box>
                <Box
                  component='td'
                  sx={{
                    p: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    color: "primary.main",
                  }}
                >
                  {pretext}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
