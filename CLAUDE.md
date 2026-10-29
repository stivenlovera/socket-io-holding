# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — run the server with hot reload (`tsx watch src/index.ts`). Listens on `PORT` (default 3000).
- `npm run build` — type-check and compile to `dist/` via `tsc`.
- `npm start` — run the compiled build (`node dist/index.js`); requires `npm run build` first.
- No test runner is configured (`npm test` exits 1).

Environment variables read at runtime: `PORT`, `LOG_LEVEL` (default `info`), `NODE_ENV` (set to `production` to suppress the console log transport).

## Architecture

A minimal Socket.IO relay between the Laravel backend (`../locker_app_web`) and the Flutter locker tablets (`../locker_app`). It holds no state and does no auth. Two source files:

- [src/index.ts](src/index.ts) — Express app wrapped in a Node `http` server with a Socket.IO `Server` (CORS open to `*`). Express serves only a `GET /` health check; all real work is Socket.IO events:
  - `join` `{ locker_id, building_id }` — sent by a tablet on connect. Room id is `[locker_id, building_id].sort().join('-')`, then the socket joins it.
  - `open_door` `{ room_id, message, locker_id }` — sent by Laravel (`DoorService::openDoor` via `sendSocketMessage()` in `app/helpers.php`, which connects, emits once and disconnects). Relayed as `door` `{ message }` (message = door id) to the room, sender excluded.
  - `update_data_base` `{ room_id, message, locker_id }` — sent by Laravel (`DoorService::updateDatabase`). Relayed as `update_data` `{ message }`; the tablet then re-syncs via `GET /api/database`.

### Room id contract

`join` sorts the ids with JS default `sort()` (lexicographic string order), while Laravel builds `room_id` as `"{locker_id}-{building_id}"` unsorted. They only match when `locker_id` sorts before `building_id` as a string (e.g. locker `5`, building `3` → tablet joins `3-5`, Laravel targets `5-3`, door never opens). Any change to room naming must be made here and in `DoorService` together.
- [src/logger.ts](src/logger.ts) — Winston logger, default export used everywhere instead of `console`. Writes to `logs/YYYY/MMMM/DD.log` through `winston-daily-rotate-file` (zipped archives, 20m/file, 90d retention). Console transport is added only when `NODE_ENV !== "production"`.

### Windows logging caveat

`winston-daily-rotate-file` has broken path-splitting on Windows when `datePattern` contains `/`. [src/logger.ts](src/logger.ts) works around this by pre-creating the current year/month folder at startup and re-checking hourly (`ensureCurrentLogDir`). Keep this workaround if changing the log path or date pattern.

## Notes

- Event names are an English/snake_case contract shared with Laravel and the Flutter app (`join`, `open_door`, `door`, `update_data_base`, `update_data`) — renaming one means changing the other projects too. Log strings are in Spanish ("Cliente conectado").
- No README. `package.json` `type` is `commonjs`; `logger.ts` relies on `__dirname`.
