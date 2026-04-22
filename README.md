# @ramarivera/pi-kimi-for-coding

A Pi extension that adds a dedicated **Kimi For Coding OAuth** provider using the official Kimi device flow plus Kimi-specific request shaping.

## What it does

- uses the official device flow at `https://auth.kimi.com`
- targets `https://api.kimi.com/coding/v1`
- sends the Kimi CLI fingerprint headers (`User-Agent` + `X-Msh-*`)
- reuses `~/.kimi/device_id` for stable device identity
- injects `prompt_cache_key`
- maps Pi thinking levels onto Kimi `thinking` + `reasoning_effort`
- refreshes OAuth tokens and re-discovers model metadata

## Install

### From npm

```bash
pi install npm:@ramarivera/pi-kimi-for-coding
```

### From GitHub

```bash
pi install git:github.com/ramarivera/pi-kimi-for-coding
```

### From a local checkout

```bash
pi install /absolute/path/to/pi-kimi-for-coding
```

## Authenticate

Start Pi and run:

```text
/login
```

Then choose **Kimi For Coding**.

## Use

After login, select the provider/model:

- provider: `kimi-for-coding-oauth`
- model: `kimi-for-coding`

## Development

```bash
bun install
bun test
bunx tsc --noEmit
```

## Notes

This package is meant to be installed as a Pi package, so it declares its extension entry under the `pi` key in `package.json`.

## License

MIT
