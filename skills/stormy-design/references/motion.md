# Motion observation and implementation

Inspect the actual clip. If the viewer cannot play it, extract frames with a
local video tool when available; disclose that frame inspection cannot establish
smoothness or exact easing. Recording duration is not transition duration.

Record:

- User action and before/after state.
- Element/property that changes; stationary anchors that maintain continuity.
- Approximate transition interval, with an observation method.
- Whether the effect is product interaction, camera movement, editing or an overlay.
- Interrupt, reverse, rapid repeat and touch/keyboard behavior.
- Reduced-motion equivalent that preserves information.

For authored motion, a reasonable starting point is 120–180ms for local feedback,
200–320ms for component changes and 400–700ms for a one-time editorial entrance.
These are authored starting ranges, not UiHall measurements. Tune to distance and
intent. Avoid making the user wait for a decorative sequence before interacting.

Animate transform and opacity where they express the intended effect. A chart
may need dimensional interpolation; make that a discrete state transition rather
than an idle loop. Playback belongs to a visible, selected or intentionally
hovered item; pause and release off-screen media. Provide explicit playback on
touch. `prefers-reduced-motion: reduce` should remove spatial entrances, smooth
scrolling and automatic previews while keeping the controls functional.
