# setup-hashi-tool

This actions downloads and adds to $PATH any tool by HashiCorp available at
[release page](https://releases.hashicorp.com).

Not all tools are tested! But popular ones should work.

## Usage

Supports `ubuntu-latest` and `macos-latest` runners with `x86` and `arm64`
architecture.

```yaml
steps:
- uses: nahsi/setup-hashi-tool@v1
  with:
    name: nomad # required
    version: 0.14.0 # default is latest
```
