# Match Pulse — live demo runbook

Target duration: 90–150 seconds.

1. Open the deployed app at `https://thegoat395.github.io/match-pulse-txline/`.
2. Introduce the problem in one sentence: fans follow a match with several disconnected tabs and no lightweight shared match ritual.
3. Select **Connect live data**. Show that Match Pulse starts its own TxLINE guest session and requires an activated API token only in the current browser session.
4. With a live TxLINE token loaded, show the fixture snapshot returning the current World Cup board.
5. Open one fixture. Point out the immediate score-snapshot read for that fixture and the event state in the right-hand panel.
6. Make a local home/draw/away pick. Explain that it stays on-device and does not create a bet or transaction.
7. Refresh the board. Explain that Match Pulse polls the official fixture snapshot every 30 seconds and reads the latest score state on demand.
8. Close with the product path: broadcaster- or community-branded matchrooms, historical recaps, and opt-in fan groups built around the same live TxLINE feed.

## Technical proof points to show

- Deployed static app and public source repository.
- `POST /auth/guest/start` in the browser network panel.
- `GET /api/fixtures/snapshot` with the documented TxLINE headers.
- `GET /api/scores/snapshot/{fixtureId}` after selecting a fixture.
- No API token appears in the repository, screenshot, or demo narration.

