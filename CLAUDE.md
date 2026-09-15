# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — run the server with hot reload (`tsx watch src/index.ts`). Listens on `PORT` (default 3000).
- `npm run build` — type-check and compile to `dist/` via `tsc`.
- `npm start` — run the compiled build (`node dist/index.js`); requires `npm run build` first.
- No test runner is configured (`npm test` exits 1).

Environment variables read at runtime: `PORT`, `LOG_LEVEL` (default `info`), `NODE_ENV` (set to `production` to suppress the console log transport).

## Architecture

A minimal Socket.IO chat relay server. Two source files:

- [src/index.ts](src/index.ts) — Express app wrapped in a Node `http` server with a Socket.IO `Server` (CORS open to `*`). Express serves only a `GET /` health check; all real work is Socket.IO events:
  - `unir-a-sala` `{ user_id, recipient_id }` — derives a deterministic room id by sorting the two ids and joining with `-`, then joins that room. Both participants independently joining produce the same room.
  - `send_message` `{ room_id, message, user_id }` — relays `mensaje` `{ message, user_id }` to everyone else in the room via `socket.to(room_id)` (sender excluded).
- [src/logger.ts](src/logger.ts) — Winston logger, default export used everywhere instead of `console`. Writes to `logs/YYYY/MMMM/DD.log` through `winston-daily-rotate-file` (zipped archives, 20m/file, 90d retention). Console transport is added only when `NODE_ENV !== "production"`.

### Windows logging caveat

`winston-daily-rotate-file` has broken path-splitting on Windows when `datePattern` contains `/`. [src/logger.ts](src/logger.ts) works around this by pre-creating the current year/month folder at startup and re-checking hourly (`ensureCurrentLogDir`). Keep this workaround if changing the log path or date pattern.

## Notes

- Client/server messages use Spanish event names and log strings (`unir-a-sala`, `mensaje`, "Cliente conectado"). Match this convention.
- Not a git repository and no README. `package.json` `type` is `commonjs`; `logger.ts` relies on `__dirname`.
