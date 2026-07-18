# Match Pulse

Match Pulse is a responsive World Cup fan matchroom built for the TxLINE × Superteam World Cup Hackathon.

It reads live TxLINE fixture and score snapshots, lets a fan open a fixture for the current event state, and keeps a local, non-wagering pick for the next match. The product intentionally does not transmit picks, place bets, or initiate transactions.

## Live TxLINE integration

The client uses these documented TxLINE endpoints:

- `POST https://txline.txodds.com/auth/guest/start` — starts a browser-local guest session.
- `GET https://txline.txodds.com/api/fixtures/snapshot` — reads the current fixture snapshot.
- `GET https://txline.txodds.com/api/scores/snapshot/{fixtureId}` — reads the selected fixture's latest score-event snapshot.

Fixture and score reads use the official `Authorization: Bearer <guest-jwt>` and `X-Api-Token: <activated-token>` headers. The app holds both credentials only in `sessionStorage`, so they disappear when the browser session ends and are never written into the repository.

## Local use

Serve the folder with any static file server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

To load live data:

1. Follow the [TxLINE World Cup Free Tier guide](https://txline.txodds.com/documentation/worldcup) with your own Solana wallet.
2. Complete the free-tier subscription and activation directly in your wallet.
3. In Match Pulse, select **Connect TxLINE**, click **Start guest session**, paste the activated API token, and select **Save & load fixtures**.

The app asks the browser for a fresh guest JWT. No wallet key, signature, seed phrase, API token, or other credential is committed or transmitted to a service other than TxLINE's documented API endpoints.

## Product notes

- **Fan accessibility:** concise match cards, keyboard-focusable controls, responsive layout, plain-language state handling.
- **Real-time responsiveness:** live fixtures are refreshed every 30 seconds; selecting a card reads the latest score snapshot for that exact fixture.
- **Originality:** the local fan-signal board turns a fixture into a shared-room ritual without betting or social-feed noise.
- **Commercial path:** a league or broadcaster could sponsor branded matchrooms, premium historical recaps, or opt-in fan communities while keeping the live data product free for casual matchdays.

## TxLINE developer feedback

The endpoints and field documentation are clear and the guest-session flow is easy to validate. The required wallet subscription is appropriate for access control, but the activation flow would be even smoother with a small official browser-side helper that packages the subscribe → activation sequence for hackathon apps.
