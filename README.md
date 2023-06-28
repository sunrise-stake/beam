## Sunrise Beams

### Build Notes

Note - due to build version conflicts, the following transitive dependencies need to be pinned:

```shell
cargo update -p indexmap --precise 1.9.3
cargo update -p toml_edit --precise 0.19.8
cargo update -p winnow --precise 0.4.1
cargo update -p toml_datetime --precise 0.6.1
cargo update -p solana-zk-token-sdk --precise 1.14.17
cargo update -p solana-program --precise 1.14.17

```

See here for more details:

- https://solana.stackexchange.com/a/6535