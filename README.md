# Veadotube API Sample (Bun + TypeScript)

This project includes a minimal sample that discovers Veadotube instances, connects to one, logs incoming messages, and after 5 seconds attempts to switch the avatar state to "happy".

- Sample entry: `src/veado.ts`
- Runtime: [Bun](https://bun.sh)

## Prerequisites
- Bun v1+
- A Veadotube instance running on the same machine/network
  - Ensure your avatar has a state with id/name "happy" or change the code to a state that exists in your setup

## Install
```sh
bun install
```

## Run the sample
```sh
bun run src/veado.ts
```

You should see logs about instance discovery, messages received (states and current state), and an attempt to set the avatar state to "happy".

## Notes
- If you don’t have a "happy" state, edit `src/veado.ts` and change `connection.setAvatarState('happy')` to a valid state id/name from your avatar.
- The sample prints detailed events to the console to help with debugging and learning the flow.
